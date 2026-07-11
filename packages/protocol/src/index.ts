import { deserializeMessages, serializeMessages } from '@agentskit/core'
import type { MemoryRecord, Message, TokenUsage } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import { z } from 'zod'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBoundedJsonValue = (input: unknown): boolean => {
  const seen = new WeakSet<object>()
  let nodes = 0
  const visit = (value: unknown, depth: number): boolean => {
    nodes += 1
    if (nodes > 1_000 || depth > 20) return false
    if (value === null || typeof value === 'boolean') return true
    if (typeof value === 'string') return value.length <= 16_384
    if (typeof value === 'number') return Number.isFinite(value)
    if (typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    if (Array.isArray(value)) return value.length <= 1_000 && value.every(item => visit(item, depth + 1))
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false
    const entries = Object.entries(value)
    return entries.length <= 1_000 && entries.every(([key, item]) => key.length <= 256 && visit(item, depth + 1))
  }
  try {
    return visit(input, 0)
  } catch {
    return false
  }
}

export const TURN_PROTOCOL = 'agentskit.chat.turn' as const
export const TURN_PROTOCOL_VERSION = 1 as const

export const COMPONENT_PROTOCOL = 'agentskit.chat.component' as const
export const COMPONENT_PROTOCOL_VERSION = 1 as const
export const ComponentKeySchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/)

export const ComponentFallbackSchema = z.object({
  kind: z.string().min(1).max(64),
  summary: z.string().min(1).max(4_096),
}).readonly()

export const ComponentRenderFrameSchema = z.object({
  protocol: z.literal(COMPONENT_PROTOCOL),
  version: z.literal(COMPONENT_PROTOCOL_VERSION),
  type: z.literal('render'),
  componentKey: ComponentKeySchema,
  instanceId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  props: z.unknown().refine(isBoundedJsonValue),
  fallback: ComponentFallbackSchema,
}).readonly()

export const ComponentSelectionEventSchema = z.object({
  protocol: z.literal(COMPONENT_PROTOCOL),
  version: z.literal(COMPONENT_PROTOCOL_VERSION),
  type: z.literal('select'),
  componentKey: ComponentKeySchema,
  instanceId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
  choiceId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
}).readonly()

export type ComponentFallback = z.infer<typeof ComponentFallbackSchema>
export type ComponentRenderFrame = z.infer<typeof ComponentRenderFrameSchema>
export type ComponentSelectionEvent = z.infer<typeof ComponentSelectionEventSchema>

export type ComponentDecodeCode =
  | 'COMPONENT_UNSUPPORTED_VERSION'
  | 'COMPONENT_UNKNOWN_TYPE'
  | 'COMPONENT_INVALID_FRAME'

export type DecodeComponentFrameResult =
  | { readonly ok: true; readonly frame: ComponentRenderFrame }
  | {
      readonly ok: false
      readonly diagnostic: {
        readonly code: ComponentDecodeCode
        readonly message: string
        readonly retryable: false
      }
    }

export const decodeComponentFrame = (input: unknown): DecodeComponentFrameResult => {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown
    } catch {
      return {
        ok: false,
        diagnostic: { code: 'COMPONENT_INVALID_FRAME', message: 'Component frame is not valid JSON.', retryable: false },
      }
    }
  }

  try {
    if (isRecord(candidate) && candidate.protocol === COMPONENT_PROTOCOL) {
      if (typeof candidate.version === 'number' && candidate.version !== COMPONENT_PROTOCOL_VERSION) {
        return {
          ok: false,
          diagnostic: { code: 'COMPONENT_UNSUPPORTED_VERSION', message: 'Component frame uses an unsupported version.', retryable: false },
        }
      }
      if (candidate.type !== 'render') {
        return {
          ok: false,
          diagnostic: { code: 'COMPONENT_UNKNOWN_TYPE', message: 'Component frame type is unknown.', retryable: false },
        }
      }
    }

    const parsed = ComponentRenderFrameSchema.safeParse(candidate)
    return parsed.success
      ? { ok: true, frame: parsed.data }
      : {
          ok: false,
          diagnostic: { code: 'COMPONENT_INVALID_FRAME', message: 'Component frame payload is invalid.', retryable: false },
        }
  } catch {
    return {
      ok: false,
      diagnostic: { code: 'COMPONENT_INVALID_FRAME', message: 'Component frame payload is invalid.', retryable: false },
    }
  }
}

export const isComponentFrameCandidate = (input: unknown): boolean => {
  try {
    const candidate = typeof input === 'string' ? JSON.parse(input) as unknown : input
    return isRecord(candidate) && candidate.protocol === COMPONENT_PROTOCOL
  } catch {
    return false
  }
}

export const createSelectionEvent = (frame: ComponentRenderFrame, choiceId: string): ComponentSelectionEvent =>
  ComponentSelectionEventSchema.parse({
    protocol: COMPONENT_PROTOCOL,
    version: COMPONENT_PROTOCOL_VERSION,
    type: 'select',
    componentKey: frame.componentKey,
    instanceId: frame.instanceId,
    choiceId,
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

const SafeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)

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

const TurnLineageSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('submit') }),
  z.object({ operation: z.enum(['retry', 'edit', 'regenerate']), parentTurnId: SafeIdentifierSchema, sourceMessageId: SafeIdentifierSchema }),
])

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
    lineage: TurnLineageSchema.optional(),
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
export type TurnLineage = NonNullable<SnapshotTurnEvent['payload']['lineage']>

export interface TurnSnapshotCursor {
  readonly apply: (event: unknown) => boolean
  readonly getSnapshot: () => SnapshotTurnEvent | undefined
}

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

export interface CreateSnapshotEventOptions {
  readonly eventId: string
  readonly sessionId: string
  readonly turnId: string
  readonly sequence: number
  readonly emittedAt: string
  readonly messages: readonly Message[]
  readonly status: SnapshotTurnEvent['payload']['status']
  readonly usage: TokenUsage
  readonly lineage?: TurnLineage
  readonly error?: TurnDiagnostic
}

export const createSnapshotEvent = (options: CreateSnapshotEventOptions): SnapshotTurnEvent => SnapshotEventSchema.parse({
  protocol: TURN_PROTOCOL,
  version: TURN_PROTOCOL_VERSION,
  eventId: options.eventId,
  sessionId: options.sessionId,
  turnId: options.turnId,
  sequence: options.sequence,
  emittedAt: options.emittedAt,
  event: 'server.turn.snapshot',
  payload: {
    messages: serializeMessages([...options.messages]).messages,
    status: options.status,
    usage: options.usage,
    ...(options.lineage === undefined ? {} : { lineage: options.lineage }),
    ...(options.error === undefined ? {} : { error: options.error }),
  },
})

export const createTurnSnapshotCursor = (sessionId: string): TurnSnapshotCursor => {
  const expectedSessionId = SafeIdentifierSchema.parse(sessionId)
  let snapshot: SnapshotTurnEvent | undefined
  return {
    apply(input) {
      const decoded = decodeTurnEvent(input)
      if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return false
      const next = decoded.event
      if (next.sessionId !== expectedSessionId || (snapshot && next.sequence <= snapshot.sequence)) return false
      snapshot = deepFreeze(next)
      return true
    },
    getSnapshot: () => snapshot,
  }
}

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

export const SESSION_PROTOCOL = 'agentskit.chat.session' as const
export const SESSION_PROTOCOL_VERSION = 1 as const

const SessionDecisionSchema = z.object({
  messageId: SafeIdentifierSchema,
  input: z.string().max(16_384),
  routeId: SafeIdentifierSchema,
  kind: z.enum(['deterministic', 'repaired', 'fallback']),
  content: z.string().max(65_536),
  fromState: z.string().min(1).max(128),
  toState: z.string().min(1).max(128),
}).readonly()

export const SessionConfirmationSchema = z.object({
  token: SafeIdentifierSchema,
  action: SafeIdentifierSchema,
  input: z.record(z.string(), z.unknown()).refine(isBoundedJsonValue),
  toolCallId: SafeIdentifierSchema,
  expiresAt: z.number().int().nonnegative(),
  status: z.enum(['pending', 'approving', 'rejecting', 'expiring', 'approved', 'rejected', 'expired']),
}).readonly()

const uniqueBy = <T>(items: readonly T[], key: (item: T) => string, context: z.RefinementCtx, path: string): void => {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const value = key(item)
    if (seen.has(value)) context.addIssue({ code: 'custom', path: [index, path], message: `${path} must be unique.` })
    seen.add(value)
  })
}

const SessionDecisionsSchema = z.array(SessionDecisionSchema).max(1_000).superRefine((items, context) =>
  uniqueBy(items, item => item.messageId, context, 'messageId'))
const SessionConfirmationsSchema = z.array(SessionConfirmationSchema).max(1_000).superRefine((items, context) => {
  uniqueBy(items, item => item.token, context, 'token')
  uniqueBy(items, item => item.toolCallId, context, 'toolCallId')
})

const SessionSnapshotObjectSchema = z.object({
  protocol: z.literal(SESSION_PROTOCOL),
  version: z.literal(SESSION_PROTOCOL_VERSION),
  sessionId: SafeIdentifierSchema,
  definitionId: SafeIdentifierSchema,
  definitionRevision: z.number().int().positive(),
  updatedAt: z.string().datetime({ offset: true }),
  cursor: z.number().int().nonnegative(),
  activeTurn: z.object({ turnId: SafeIdentifierSchema, expiresAt: z.number().int().nonnegative() }).readonly().optional(),
  terminalTurns: z.array(z.object({ turnId: SafeIdentifierSchema, outcome: z.enum(['completed', 'indeterminate']) }).readonly())
    .max(64).superRefine((items, context) => uniqueBy(items, item => item.turnId, context, 'turnId')).readonly().optional(),
  conversation: z.object({
    state: z.string().min(1).max(128),
    decisions: SessionDecisionsSchema,
  }).readonly().optional(),
  confirmations: SessionConfirmationsSchema,
})

export const SessionSnapshotSchema = SessionSnapshotObjectSchema.readonly()

const LegacySessionSnapshotSchema = SessionSnapshotObjectSchema.omit({ protocol: true, version: true })
  .extend({ version: z.literal(0) })

export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>
export type SessionConfirmation = z.infer<typeof SessionConfirmationSchema>

export type DecodeSessionSnapshotResult =
  | { readonly ok: true; readonly snapshot: SessionSnapshot }
  | { readonly ok: false; readonly diagnostic: { readonly code: 'SESSION_INVALID_SNAPSHOT' | 'SESSION_UNSUPPORTED_VERSION'; readonly message: string; readonly retryable: false } }

export const decodeSessionSnapshot = (input: unknown): DecodeSessionSnapshotResult => {
  let candidate = input
  if (typeof input === 'string') {
    try { candidate = JSON.parse(input) as unknown } catch {
      return { ok: false, diagnostic: { code: 'SESSION_INVALID_SNAPSHOT', message: 'Session snapshot is not valid JSON.', retryable: false } }
    }
  }
  try {
    if (isRecord(candidate) && typeof candidate.version === 'number' && candidate.version !== 0 && candidate.version !== SESSION_PROTOCOL_VERSION) {
      return { ok: false, diagnostic: { code: 'SESSION_UNSUPPORTED_VERSION', message: 'Session snapshot uses an unsupported version.', retryable: false } }
    }
    const current = SessionSnapshotSchema.safeParse(candidate)
    if (current.success) return { ok: true, snapshot: current.data }
    const legacy = LegacySessionSnapshotSchema.safeParse(candidate)
    return legacy.success
      ? { ok: true, snapshot: SessionSnapshotSchema.parse({ ...legacy.data, protocol: SESSION_PROTOCOL, version: SESSION_PROTOCOL_VERSION }) }
      : { ok: false, diagnostic: { code: 'SESSION_INVALID_SNAPSHOT', message: 'Session snapshot payload is invalid.', retryable: false } }
  } catch {
    return { ok: false, diagnostic: { code: 'SESSION_INVALID_SNAPSHOT', message: 'Session snapshot payload is invalid.', retryable: false } }
  }
}
