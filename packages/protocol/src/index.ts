import { deserializeMessages } from '@agentskit/core'
import type { ChatState, MemoryRecord, Message, ToolCall, TokenUsage } from '@agentskit/core'
import { z } from 'zod'

export const TURN_PROTOCOL = 'agentskit.chat.turn' as const
export const TURN_PROTOCOL_VERSION = 1 as const

type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]))

const JsonRecordSchema = z.record(z.string(), JsonValueSchema)

const ContentPartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image'),
    source: z.string(),
    mimeType: z.string().optional(),
    detail: z.enum(['low', 'high', 'auto']).optional(),
  }),
  z.object({
    type: z.literal('audio'),
    source: z.string(),
    mimeType: z.string().optional(),
    durationSec: z.number().nonnegative().optional(),
  }),
  z.object({
    type: z.literal('video'),
    source: z.string(),
    mimeType: z.string().optional(),
    durationSec: z.number().nonnegative().optional(),
  }),
  z.object({
    type: z.literal('file'),
    source: z.string(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
  }),
])

export const ToolCallWireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  args: JsonRecordSchema,
  result: z.string().optional(),
  error: z.string().optional(),
  status: z.enum(['pending', 'running', 'complete', 'error', 'requires_confirmation']),
})

export const WireMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  parts: z.array(ContentPartSchema).optional(),
  status: z.enum(['pending', 'streaming', 'complete', 'error']),
  toolCalls: z.array(ToolCallWireSchema).optional(),
  toolCallId: z.string().optional(),
  metadata: JsonRecordSchema.optional(),
  createdAt: z.string().datetime({ offset: true }),
})

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
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  emittedAt: z.string().datetime({ offset: true }),
}

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
    messages: z.array(WireMessageSchema),
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
export type WireMessage = z.infer<typeof WireMessageSchema>
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const diagnostic = (
  code: ProtocolDecodeCode,
  message: string,
  input: unknown,
): DecodeTurnEventResult => ({
  ok: false,
  diagnostic: {
    code,
    message,
    retryable: false,
    ...(isRecord(input) && typeof input.eventId === 'string' ? { eventId: input.eventId } : {}),
  },
})

export const decodeTurnEvent = (input: unknown): DecodeTurnEventResult => {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown
    } catch {
      return diagnostic('PROTOCOL_INVALID_PAYLOAD', 'Turn event is not valid JSON.', input)
    }
  }

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
}

export const encodeTurnEvent = (event: TurnEvent): string =>
  JSON.stringify(TurnEventSchema.parse(event))

export const snapshotMessages = (event: SnapshotTurnEvent): Message[] =>
  deserializeMessages({ version: 1, messages: event.payload.messages } as MemoryRecord)

type Assert<T extends true> = T
type _StatusCompatibility = Assert<SnapshotTurnEvent['payload']['status'] extends ChatState['status'] ? true : false>
type _UsageCompatibility = Assert<z.infer<typeof TokenUsageSchema> extends TokenUsage ? true : false>
type _ToolStatusCompatibility = Assert<z.infer<typeof ToolCallWireSchema>['status'] extends ToolCall['status'] ? true : false>
