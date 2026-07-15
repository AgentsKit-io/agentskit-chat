import type { ChatReturn, Message, StreamStatus, TokenUsage } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import { z } from 'zod'

const IdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)

const UsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
}).strict()

const ErrorEnvelopeSchema = z.object({
  message: z.string().min(1).max(4_096),
  code: IdentifierSchema.optional(),
}).strict()

const ControlledChatSnapshotSchema = z.object({
  sessionId: IdentifierSchema,
  messages: z.array(z.unknown()).max(10_000),
  status: z.enum(['idle', 'streaming', 'complete', 'error']),
  input: z.string().max(100_000),
  error: ErrorEnvelopeSchema.nullable(),
  usage: UsageSchema,
}).strict()

export type ControlledChatActions = Pick<ChatReturn,
  'send' | 'stop' | 'retry' | 'edit' | 'regenerate' | 'setInput' | 'clear' | 'proposeToolCall' | 'approve' | 'deny'
>

/**
 * A serializable, host-owned projection of AgentsKit chat state.
 * Transport, persistence, authentication, and authorization remain host concerns.
 */
export interface ControlledChatSource {
  readonly snapshot: unknown
  readonly actions: ControlledChatActions
}

export interface ControlledChatSnapshot {
  readonly sessionId: string
  readonly messages: readonly Message[]
  readonly status: StreamStatus
  readonly input: string
  readonly error: Error | null
  readonly usage: TokenUsage
}

export interface ControlledChatDriver extends ChatReturn {
  readonly sessionId: string
  readonly mode: 'controlled'
}

const hydrateMessages = (messages: readonly unknown[]): readonly Message[] => {
  let record
  try {
    record = validateMemoryRecord({ version: 1, messages })
  } catch (cause) {
    throw new TypeError('Serialized message record is invalid.', { cause })
  }
  return record.messages.map(message => ({ ...message, createdAt: new Date(message.createdAt) }))
}

const hydrateError = (input: z.infer<typeof ErrorEnvelopeSchema> | null): Error | null => {
  if (input === null) return null
  const error = new Error(input.message)
  if (input.code !== undefined) error.name = input.code
  return error
}

export const parseControlledChatSnapshot = (input: unknown): ControlledChatSnapshot => {
  const parsed = ControlledChatSnapshotSchema.parse(input)
  return Object.freeze({
    sessionId: parsed.sessionId,
    messages: Object.freeze([...hydrateMessages(parsed.messages)]),
    status: parsed.status,
    input: parsed.input,
    error: hydrateError(parsed.error),
    usage: Object.freeze({ ...parsed.usage }),
  })
}

export const createControlledChatDriver = ({ snapshot, actions }: ControlledChatSource): ControlledChatDriver => {
  const state = parseControlledChatSnapshot(snapshot)
  return Object.freeze({
    ...state,
    messages: [...state.messages],
    send: actions.send,
    stop: actions.stop,
    retry: actions.retry,
    edit: actions.edit,
    regenerate: actions.regenerate,
    setInput: actions.setInput,
    clear: actions.clear,
    proposeToolCall: actions.proposeToolCall,
    approve: actions.approve,
    deny: actions.deny,
    mode: 'controlled',
  })
}
