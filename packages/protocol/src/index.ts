import { deserializeMessages } from '@agentskit/core'
import type { MemoryRecord, Message } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import { z } from 'zod'

export const TURN_PROTOCOL = 'agentskit.chat.turn' as const
export const TURN_PROTOCOL_VERSION = 1 as const

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
})

export const TurnDiagnosticSchema = z.object({
  version: z.literal(1),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  message: z.string().min(1),
  retryable: z.boolean(),
})

export type TurnDiagnostic = z.infer<typeof TurnDiagnosticSchema>

const EnvelopeFields = {
  protocol: z.literal(TURN_PROTOCOL),
  version: z.literal(TURN_PROTOCOL_VERSION),
  eventId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  sessionId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  turnId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  sequence: z.number().int().nonnegative(),
  emittedAt: z.string().datetime({ offset: true }),
}

const MemoryMessagesSchema = z.array(z.unknown()).transform((messages, context): MemoryRecord['messages'] => {
  try {
    return validateMemoryRecord({ version: 1, messages }).messages
  } catch {
    context.addIssue({ code: 'custom', message: 'Messages are not a valid AgentsKit memory record.' })
    return z.NEVER
  }
})

const SubmitEventSchema = z.object({
  ...EnvelopeFields,
  event: z.literal('client.turn.submit'),
  payload: z.object({
    input: z.string().min(1).refine(value => value.trim().length > 0),
  }),
})

const SnapshotEventSchema = z.object({
  ...EnvelopeFields,
  event: z.literal('server.turn.snapshot'),
  payload: z.object({
    messages: MemoryMessagesSchema,
    status: z.enum(['idle', 'streaming', 'complete', 'error']),
    usage: TokenUsageSchema,
    error: TurnDiagnosticSchema.optional(),
  }),
})

const DiagnosticEventSchema = z.object({
  ...EnvelopeFields,
  event: z.literal('server.turn.diagnostic'),
  payload: TurnDiagnosticSchema,
})

export const TurnEventSchema = z.discriminatedUnion('event', [
  SubmitEventSchema,
  SnapshotEventSchema,
  DiagnosticEventSchema,
])

export type TurnEvent = z.infer<typeof TurnEventSchema>
export type WireMessage = MemoryRecord['messages'][number]
export type SubmitTurnEvent = z.infer<typeof SubmitEventSchema>
export type SnapshotTurnEvent = z.infer<typeof SnapshotEventSchema>
export type DiagnosticTurnEvent = z.infer<typeof DiagnosticEventSchema>

export type ProtocolDecodeCode =
  | 'PROTOCOL_UNSUPPORTED_VERSION'
  | 'PROTOCOL_UNKNOWN_EVENT'
  | 'PROTOCOL_INVALID_PAYLOAD'

export interface ProtocolDecodeDiagnostic {
  readonly code: ProtocolDecodeCode
  readonly message: string
  readonly retryable: false
  readonly eventId?: string
}

export type DecodeTurnEventResult =
  | { readonly ok: true; readonly event: TurnEvent }
  | { readonly ok: false; readonly diagnostic: ProtocolDecodeDiagnostic }

const eventNames = new Set(['client.turn.submit', 'server.turn.snapshot', 'server.turn.diagnostic'])
const SafeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const safeEventId = (input: unknown): string | undefined => {
  try {
    if (!isRecord(input)) return undefined
    const parsed = SafeIdentifierSchema.safeParse(input.eventId)
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

const diagnostic = (
  code: ProtocolDecodeCode,
  message: string,
  input: unknown,
): DecodeTurnEventResult => {
  const eventId = safeEventId(input)
  return {
    ok: false,
    diagnostic: {
      code,
      message,
      retryable: false,
      ...(eventId === undefined ? {} : { eventId }),
    },
  }
}

export const decodeTurnEvent = (input: unknown): DecodeTurnEventResult => {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown
    } catch {
      return diagnostic('PROTOCOL_INVALID_PAYLOAD', 'Turn event is not valid JSON.', input)
    }
  }

  try {
    if (
      isRecord(candidate)
      && candidate.protocol === TURN_PROTOCOL
      && typeof candidate.version === 'number'
      && candidate.version !== TURN_PROTOCOL_VERSION
    ) {
      return diagnostic(
        'PROTOCOL_UNSUPPORTED_VERSION',
        'Turn event uses an unsupported protocol version.',
        candidate,
      )
    }

    if (
      isRecord(candidate)
      && candidate.protocol === TURN_PROTOCOL
      && candidate.version === TURN_PROTOCOL_VERSION
      && typeof candidate.event === 'string'
      && !eventNames.has(candidate.event)
    ) {
      return diagnostic(
        'PROTOCOL_UNKNOWN_EVENT',
        'Turn event kind is unknown.',
        candidate,
      )
    }

    const parsed = TurnEventSchema.safeParse(candidate)
    return parsed.success
      ? { ok: true, event: parsed.data }
      : diagnostic('PROTOCOL_INVALID_PAYLOAD', 'Turn event payload is invalid.', candidate)
  } catch {
    return diagnostic('PROTOCOL_INVALID_PAYLOAD', 'Turn event payload is invalid.', candidate)
  }
}

export const encodeTurnEvent = (event: TurnEvent): string =>
  JSON.stringify(TurnEventSchema.parse(event))

export const snapshotMessages = (event: unknown): Message[] => {
  const validated = SnapshotEventSchema.parse(event)
  return deserializeMessages({ version: 1, messages: validated.payload.messages })
}
