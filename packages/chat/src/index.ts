import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterRequest, ChatConfig, ChatReturn, Message, StreamSource, ToolAuthorizer, ToolCall } from '@agentskit/core'
import { createStatechartInstance, defineStatechart, StatechartError, transitionStatechart } from '@agentskit/statechart'
import type { JsonObject, StatechartDefinition, StatechartEvent, StatechartInstance, StatechartState, StatechartTransition } from '@agentskit/statechart'
import {
  ComponentFallbackSchema,
  ComponentKeySchema,
  createInteractionEvent,
  createSelectionEvent,
  decodeComponentFrame,
  decodeSessionSnapshot,
  SESSION_PROTOCOL,
  SESSION_PROTOCOL_VERSION,
  SessionSnapshotSchema,
  type ComponentRenderFrame,
  type ComponentInteractionEvent,
  type ComponentSelectionEvent,
  type SessionConfirmation,
  type SessionSnapshot,
} from '@agentskit/chat-protocol'
import { z } from 'zod'
import { CHOICE_LIST_COMPONENT_KEY, ChoiceListPropsSchema, STANDARD_COMPONENT_KEYS, StandardComponentCatalog, validateStandardComponentInteraction, type ChoiceAction, type ChoiceListProps, type ComponentDefinition } from './catalog.js'

export * from './catalog.js'
export * from './ask.js'
export * from './deterministic.js'

const ThemeColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Theme colors must use portable hex notation.')
const ThemeLengthSchema = z.number().finite().nonnegative().max(1_000)
const ThemeFontFamilySchema = z.string().regex(/^(?:system|[A-Za-z0-9][A-Za-z0-9 _-]{0,127})$/, 'Theme fontFamily must be system or one portable family name.')
const ChatThemeColorsSchema = z.object({
  background: ThemeColorSchema,
  surface: ThemeColorSchema,
  border: ThemeColorSchema,
  text: ThemeColorSchema,
  muted: ThemeColorSchema,
  accent: ThemeColorSchema,
  onAccent: ThemeColorSchema,
  danger: ThemeColorSchema,
}).strict()
const ChatThemeSpacingSchema = z.object({ small: ThemeLengthSchema, medium: ThemeLengthSchema, large: ThemeLengthSchema }).strict()
const ChatThemeRadiusSchema = z.object({ medium: ThemeLengthSchema, large: ThemeLengthSchema }).strict()

export const ChatThemeSchema = z.object({
  colors: ChatThemeColorsSchema.readonly(),
  spacing: ChatThemeSpacingSchema.readonly(),
  radius: ChatThemeRadiusSchema.readonly(),
  fontFamily: ThemeFontFamilySchema,
}).strict().readonly()

export type ChatTheme = z.infer<typeof ChatThemeSchema>
export type ChatThemeInput = {
  readonly colors?: Partial<ChatTheme['colors']>
  readonly spacing?: Partial<ChatTheme['spacing']>
  readonly radius?: Partial<ChatTheme['radius']>
  readonly fontFamily?: string
}

export const defaultChatTheme: ChatTheme = ChatThemeSchema.parse({
  colors: { background: '#ffffff', surface: '#f3f4f6', border: '#d1d5db', text: '#111827', muted: '#6b7280', accent: '#2563eb', onAccent: '#ffffff', danger: '#dc2626' },
  spacing: { small: 8, medium: 12, large: 16 },
  radius: { medium: 8, large: 12 },
  fontFamily: 'system',
})

export const resolveChatTheme = (input: unknown = {}): ChatTheme => {
  const candidate = z.object({
    colors: ChatThemeColorsSchema.partial().strict().optional(),
    spacing: ChatThemeSpacingSchema.partial().strict().optional(),
    radius: ChatThemeRadiusSchema.partial().strict().optional(),
    fontFamily: ThemeFontFamilySchema.optional(),
  }).strict().parse(input)
  return ChatThemeSchema.parse({
    colors: { ...defaultChatTheme.colors, ...candidate.colors },
    spacing: { ...defaultChatTheme.spacing, ...candidate.spacing },
    radius: { ...defaultChatTheme.radius, ...candidate.radius },
    fontFamily: candidate.fontFamily ?? defaultChatTheme.fontFamily,
  })
}

export const getLifecycleTargets = (messages: readonly Message[]): { readonly userId: string | undefined, readonly assistantId: string | undefined } => {
  const assistant = messages.at(-1)
  if (assistant?.role !== 'assistant') return { userId: undefined, assistantId: undefined }
  const userId = messages.slice(0, -1).reverse().find(message => message.role === 'user')?.id
  return userId === undefined
    ? { userId: undefined, assistantId: undefined }
    : { userId, assistantId: assistant.id }
}

export interface TrustedActionContext {
  readonly sessionId: string
  readonly capabilities: readonly string[]
}

export type ActionPolicyReason = 'allowed' | 'missing-context' | 'session-mismatch' | 'action-unregistered' | 'missing-capability' | 'composed-policy-denied' | 'policy-failure'

export interface ActionPolicyTrace {
  readonly id: string
  readonly toolCallId: string
  readonly action: string
  readonly phase: 'propose' | 'execute'
  readonly decision: 'allow' | 'deny'
  readonly reason: ActionPolicyReason
  readonly requiredCapabilities: readonly string[]
  readonly timestamp: number
}

export interface ActionPolicy {
  readonly authorizeToolCall: ToolAuthorizer
  readonly compose: (authorizer?: ToolAuthorizer) => ToolAuthorizer
  readonly getTrace: () => readonly ActionPolicyTrace[]
}

export interface CapabilityPolicyOptions {
  readonly sessionId: string
  readonly getContext: () => TrustedActionContext | undefined
  readonly requirements: Readonly<Record<string, readonly string[]>>
  readonly onTrace?: (trace: ActionPolicyTrace) => void | Promise<void>
  readonly now?: () => number
}

export const createCapabilityPolicy = ({ sessionId, getContext, requirements, onTrace, now = Date.now }: CapabilityPolicyOptions): ActionPolicy => {
  if (sessionId.length === 0) invalidConfirmation('Action policy session is invalid.')
  const required = new Map(Object.entries(requirements).map(([action, capabilities]) => {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(action)
      || capabilities.some(capability => !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(capability))) {
      return invalidConfirmation('Action policy requirements are invalid.')
    }
    return [action, Object.freeze([...new Set(capabilities)])] as const
  }))
  const traces: ActionPolicyTrace[] = []
  let sequence = 0
  const record = (call: ToolCall, phase: ActionPolicyTrace['phase'], capabilities: readonly string[], reason: ActionPolicyReason): ActionPolicyTrace => {
    const trace: ActionPolicyTrace = Object.freeze({
      id: `policy-${++sequence}`,
      toolCallId: call.id,
      action: call.name,
      phase,
      decision: reason === 'allowed' ? 'allow' : 'deny',
      reason,
      requiredCapabilities: capabilities,
      timestamp: now(),
    })
    traces.push(trace)
    try { void Promise.resolve(onTrace?.(trace)).catch(() => undefined) } catch { /* observer isolation */ }
    return trace
  }
  const decide = (call: ToolCall): { readonly capabilities: readonly string[], readonly reason: ActionPolicyReason } => {
    const capabilities = required.get(call.name)
    let trusted: TrustedActionContext | undefined
    try {
      const candidate = getContext()
      if (candidate !== undefined && (typeof candidate.sessionId !== 'string'
        || !Array.isArray(candidate.capabilities)
        || !candidate.capabilities.every(capability => typeof capability === 'string'))) throw new TypeError('Invalid trusted context')
      trusted = candidate === undefined ? undefined : {
        sessionId: candidate.sessionId,
        capabilities: Object.freeze([...candidate.capabilities]),
      }
    } catch { return { capabilities: capabilities ?? Object.freeze([]), reason: 'policy-failure' } }
    return {
      capabilities: capabilities ?? Object.freeze([]),
      reason: capabilities === undefined
        ? 'action-unregistered'
        : trusted === undefined
          ? 'missing-context'
          : trusted.sessionId !== sessionId
            ? 'session-mismatch'
            : capabilities.some(capability => !trusted.capabilities.includes(capability))
              ? 'missing-capability'
              : 'allowed',
    }
  }
  return {
    async authorizeToolCall(call, context) {
      const { capabilities, reason } = decide(call)
      const trace = record(call, context.phase, capabilities, reason)
      return { allowed: trace.decision === 'allow', ...(trace.decision === 'deny' ? { reason: trace.reason } : {}) }
    },
    compose: authorizer => async (call, context) => {
      let local = decide(call)
      let reason = local.reason
      if (reason === 'allowed' && authorizer) {
        try {
          if (!(await authorizer(call, context)).allowed) reason = 'composed-policy-denied'
          else {
            local = decide(call)
            reason = local.reason
          }
        } catch { reason = 'policy-failure' }
      }
      const trace = record(call, context.phase, local.capabilities, reason)
      return { allowed: trace.decision === 'allow', ...(trace.decision === 'deny' ? { reason: trace.reason } : {}) }
    },
    getTrace: () => Object.freeze([...traces]),
  }
}

export const withActionPolicy = (chat: ChatConfig, policy: ActionPolicy): ChatConfig => {
  return {
    ...chat,
    authorizeToolCall: policy.compose(chat.authorizeToolCall),
  }
}

export const resolveChoiceAction = (frame: ComponentRenderFrame, choiceId: string): ChoiceAction | undefined => {
  const props = ChoiceListPropsSchema.parse(frame.props)
  return props.choices.find(choice => choice.id === choiceId)?.action
}

export type ActionConfirmationStatus = 'pending' | 'approving' | 'rejecting' | 'expiring' | 'approved' | 'rejected' | 'expired'

export interface ActionConfirmation {
  readonly token: string
  readonly sessionId: string
  readonly action: string
  readonly input: Readonly<Record<string, unknown>>
  readonly toolCallId: string
  readonly expiresAt: number
  readonly status: ActionConfirmationStatus
}

export interface ActionConfirmationCoordinator {
  readonly propose: (action: ChoiceAction) => Promise<ActionConfirmation>
  readonly approve: (token: string, sessionId: string) => Promise<ActionConfirmation>
  readonly reject: (token: string, sessionId: string, reason?: string) => Promise<ActionConfirmation>
  readonly getByToolCall: (toolCallId: string) => ActionConfirmation | undefined
  readonly getSnapshot: () => readonly ActionConfirmation[]
}

export interface ActionConfirmationOptions {
  readonly sessionId: string
  readonly chat: Pick<ChatReturn, 'proposeToolCall' | 'approve' | 'deny'>
  readonly ttlMs?: number
  readonly now?: () => number
  readonly createId?: () => string
  readonly initialRecords?: readonly SessionConfirmation[]
  readonly onChange?: (records: readonly ActionConfirmation[]) => void | Promise<void>
  readonly claimStatus?: (record: ActionConfirmation, status: Exclude<ActionConfirmationStatus, 'pending'>) => boolean | Promise<boolean>
}

const invalidConfirmation = (message: string): never => {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message,
    hint: 'Use the pending confirmation token in the session that created it.',
  })
}

const freezeJson = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeJson(child)
    Object.freeze(value)
  }
  return value
}

export const createActionConfirmation = ({
  sessionId,
  chat,
  ttlMs = 300_000,
  now = Date.now,
  createId,
  initialRecords = [],
  onChange,
  claimStatus,
}: ActionConfirmationOptions): ActionConfirmationCoordinator => {
  if (sessionId.length === 0 || !Number.isSafeInteger(ttlMs) || ttlMs <= 0) invalidConfirmation('Action confirmation options are invalid.')
  let sequence = 0
  const nextId = createId ?? (() => `${(++sequence).toString(36)}-${now().toString(36)}`)
  const records = new Map<string, ActionConfirmation>()
  const tokensByCall = new Map<string, string>()
  const operations = new Map<string, Promise<ActionConfirmation>>()
  const snapshot = (record: ActionConfirmation, status: ActionConfirmationStatus): ActionConfirmation => Object.freeze({ ...record, status })
  const requireRecord = (token: string, requestedSession: string): ActionConfirmation => {
    const record = records.get(token)
    if (!record || record.sessionId !== requestedSession) return invalidConfirmation('Action confirmation token is invalid for this session.')
    return record
  }
  const runOnce = (token: string, operation: () => Promise<ActionConfirmation>): Promise<ActionConfirmation> => {
    const current = operations.get(token)
    if (current) return current
    const pending = operation().finally(() => operations.delete(token))
    operations.set(token, pending)
    return pending
  }
  const changed = async (): Promise<void> => { await onChange?.(Object.freeze([...records.values()])) }
  const claim = async (record: ActionConfirmation, status: Exclude<ActionConfirmationStatus, 'pending'>): Promise<ActionConfirmation> => {
    const terminal = snapshot(record, status)
    if (claimStatus && !(await claimStatus(record, status))) invalidConfirmation('Action confirmation was already resolved by another client.')
    records.set(record.token, terminal)
    if (!claimStatus) await changed()
    return terminal
  }
  for (const persisted of initialRecords) {
    const record = freezeJson({ ...persisted, sessionId }) as ActionConfirmation
    records.set(record.token, record)
    tokensByCall.set(record.toolCallId, record.token)
  }
  return {
    async propose(action) {
      const suffix = nextId()
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(suffix)) invalidConfirmation('Action confirmation id is invalid.')
      const call: ToolCall = await chat.proposeToolCall({ id: `app-${suffix}`, name: action.name, args: action.input })
      const token = `confirm-${suffix}`
      const record: ActionConfirmation = Object.freeze({
        token,
        sessionId,
        action: call.name,
        input: freezeJson(structuredClone(call.args)),
        toolCallId: call.id,
        expiresAt: now() + ttlMs,
        status: call.status === 'requires_confirmation' ? 'pending' : 'rejected',
      })
      records.set(token, record)
      tokensByCall.set(call.id, token)
      await changed()
      return record
    },
    approve(token, requestedSession) {
      return runOnce(token, async () => {
        const record = requireRecord(token, requestedSession)
        if (record.status !== 'pending') return record
        if (now() >= record.expiresAt) {
          const expiring = await claim(record, 'expiring')
          try { await chat.deny(record.toolCallId, 'confirmation expired') } catch (error) { if (!claimStatus) { records.set(token, record); await changed() }; throw error }
          return claim(expiring, 'expired')
        }
        const approving = await claim(record, 'approving')
        try { await chat.approve(record.toolCallId) } catch (error) { if (!claimStatus) { records.set(token, record); await changed() }; throw error }
        return claim(approving, 'approved')
      })
    },
    reject(token, requestedSession, reason) {
      return runOnce(token, async () => {
        const record = requireRecord(token, requestedSession)
        if (record.status !== 'pending') return record
        const rejecting = await claim(record, 'rejecting')
        try { await chat.deny(record.toolCallId, reason) } catch (error) { if (!claimStatus) { records.set(token, record); await changed() }; throw error }
        return claim(rejecting, 'rejected')
      })
    },
    getByToolCall(toolCallId) {
      const token = tokensByCall.get(toolCallId)
      return token === undefined ? undefined : records.get(token)
    },
    getSnapshot: () => Object.freeze([...records.values()]),
  }
}

export type ComponentManifest = Readonly<Record<string, ComponentDefinition<unknown>>>

export const defineComponentManifest = (
  components: readonly ComponentDefinition<unknown>[],
): ComponentManifest => {
  const manifest: Record<string, ComponentDefinition<unknown>> = Object.create(null) as Record<string, ComponentDefinition<unknown>>
  for (const component of components) {
    const standardDefinition = StandardComponentCatalog.find(candidate => candidate.key === component.key)
    if (!ComponentKeySchema.safeParse(component.key).success || Object.hasOwn(manifest, component.key) || (standardDefinition !== undefined && standardDefinition !== component)) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'Component manifest keys must be non-empty, unique, and must not override standard catalog keys.',
        hint: 'Register each application component exactly once and use the canonical definition for standard keys.',
      })
    }
    manifest[component.key] = component
  }
  return manifest
}

export type ResolveComponentFrameResult<T = unknown> =
  | { readonly ok: true; readonly frame: ComponentRenderFrame; readonly props: T }
  | {
      readonly ok: false
      readonly diagnostic: {
        readonly code: 'COMPONENT_UNKNOWN' | 'COMPONENT_INVALID_PROPS' | import('@agentskit/chat-protocol').ComponentDecodeCode
        readonly message: string
        readonly retryable: false
      }
    }

export const resolveComponentFrame = (
  input: unknown,
  manifest: ComponentManifest,
): ResolveComponentFrameResult => {
  const decoded = decodeComponentFrame(input)
  if (!decoded.ok) return decoded
  if (!Object.hasOwn(manifest, decoded.frame.componentKey)) return {
    ok: false,
    diagnostic: { code: 'COMPONENT_UNKNOWN', message: 'Component is not registered.', retryable: false },
  }
  const component = manifest[decoded.frame.componentKey]!
  const props = component.propsSchema.safeParse(decoded.frame.props)
  return props.success
    ? { ok: true, frame: decoded.frame, props: props.data }
    : {
        ok: false,
        diagnostic: { code: 'COMPONENT_INVALID_PROPS', message: 'Component props are invalid.', retryable: false },
      }
}

export const createComponentInteraction = (
  frame: ComponentRenderFrame,
  manifest: ComponentManifest,
  event: string,
  value?: unknown,
): ComponentInteractionEvent => {
  const resolved = resolveComponentFrame(frame, manifest)
  const definition = resolved.ok ? manifest[resolved.frame.componentKey] : undefined
  const declared = definition?.events?.find(candidate => candidate.name === event)
  const isStandard = STANDARD_COMPONENT_KEYS.includes(frame.componentKey as typeof STANDARD_COMPONENT_KEYS[number])
  const validValue = isStandard
    ? resolved.ok && validateStandardComponentInteraction(frame.componentKey, resolved.props, event, value)
    : declared?.value === 'none'
    ? value === undefined
    : declared?.value === 'id'
      ? typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
      : declared?.value === 'url'
        ? typeof value === 'string' && (/^\/(?!\/)/.test(value) || (() => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.username === '' && url.password === '' } catch { return false } })())
        : declared?.value === 'form'
          ? value !== null && typeof value === 'object' && !Array.isArray(value)
          : false
  if (!resolved.ok || !declared || !validValue) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'Component interaction is not declared by the resolved component.',
      hint: 'Emit only catalog events with the declared value shape.',
    })
  }
  return createInteractionEvent(frame, event, value)
}

export const resolveComponentFallback = (input: unknown, manifest: ComponentManifest): string | undefined => {
  const resolved = resolveComponentFrame(input, manifest)
  if (!resolved.ok) return undefined
  return manifest[resolved.frame.componentKey]?.fallback?.(resolved.props)
}

export type ResolveChoiceListFrameResult = ResolveComponentFrameResult<ChoiceListProps>

export const resolveChoiceListFrame = (
  input: unknown,
  manifest: ComponentManifest,
): ResolveChoiceListFrameResult => {
  const resolved = resolveComponentFrame(input, manifest)
  if (!resolved.ok) return resolved
  if (resolved.frame.componentKey !== CHOICE_LIST_COMPONENT_KEY) return {
    ok: false,
    diagnostic: { code: 'COMPONENT_UNKNOWN', message: 'Component is not a ChoiceList.', retryable: false },
  }
  const props = ChoiceListPropsSchema.safeParse(resolved.props)
  return props.success
    ? { ok: true, frame: resolved.frame, props: props.data }
    : {
        ok: false,
        diagnostic: { code: 'COMPONENT_INVALID_PROPS', message: 'ChoiceList props are invalid.', retryable: false },
      }
}

export const selectChoice = (frame: ComponentRenderFrame, choiceId: string): ComponentSelectionEvent => {
  if (frame.componentKey !== CHOICE_LIST_COMPONENT_KEY) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'Selection frame is not a ChoiceList.',
      hint: 'Resolve the frame through ChoiceListComponent before emitting a selection.',
    })
  }
  const props = ChoiceListPropsSchema.parse(frame.props)
  if (!props.choices.some(choice => choice.id === choiceId)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'Selected choice is not present in the ChoiceList.',
      hint: 'Emit only choice ids declared by the validated render frame.',
    })
  }
  return createSelectionEvent(frame, choiceId)
}

export type TurnTraceKind = 'deterministic' | 'agentic' | 'repaired' | 'fallback'

export interface TurnTrace {
  readonly kind: TurnTraceKind
  readonly routeId?: string
  readonly fromState: string
  readonly toState: string
}

export interface ConversationStateDefinition {
  readonly on?: Readonly<Record<string, string>>
  readonly actions?: readonly string[]
}

export interface DeterministicRoute {
  readonly id: string
  readonly event: string
  readonly states?: readonly string[]
  readonly match: (input: string) => boolean
  readonly response: (input: string, context: DeterministicRouteContext) => string
  readonly traceKind?: Exclude<TurnTraceKind, 'agentic'>
}

export interface DeterministicRouteContext {
  readonly sessionId: string
  readonly messageId?: string
}

export interface ConversationDefinition {
  readonly initial: string
  readonly states: Readonly<Record<string, ConversationStateDefinition>>
  readonly routes: readonly DeterministicRoute[]
  readonly onTrace?: (trace: TurnTrace) => void | Promise<void>
}

export interface ChatDefinition {
  readonly id: string
  readonly revision?: number
  readonly chat: ChatConfig
  readonly conversation?: ConversationDefinition
  readonly components?: ComponentManifest
}

export const defineChat = <const T extends ChatDefinition>(definition: T): T => definition

export interface ConversationSnapshot {
  readonly state: string
  readonly events: readonly string[]
  readonly actions: readonly string[]
}

export interface ChatSession {
  readonly sessionId: string
  readonly definitionId: string
  readonly definitionRevision: number
  readonly chat: ChatConfig
  readonly updateChat: (chat: ChatConfig) => ChatConfig
  readonly getConversationSnapshot: () => ConversationSnapshot | undefined
  readonly createConfirmation: (options: Omit<ActionConfirmationOptions, 'sessionId' | 'initialRecords' | 'onChange' | 'claimStatus'>) => ActionConfirmationCoordinator
  readonly persist: (signal?: AbortSignal) => Promise<void>
  readonly getCursor: () => number
  readonly claimTurn: (turnId: string, leaseMs: number, signal?: AbortSignal) => Promise<boolean>
  readonly releaseTurn: (turnId: string, outcome: 'completed' | 'indeterminate', signal?: AbortSignal) => Promise<void>
}

export interface SessionStorage {
  readonly load: (sessionId: string, signal?: AbortSignal) => unknown | Promise<unknown>
  readonly save: (snapshot: SessionSnapshot, expectedCursor: number | undefined, signal?: AbortSignal) => boolean | Promise<boolean>
  readonly delete?: (sessionId: string, signal?: AbortSignal) => void | Promise<void>
}

export interface ChatSessionOptions {
  readonly sessionId?: string
  readonly snapshot?: SessionSnapshot
  readonly storage?: SessionStorage
  readonly now?: () => Date
  readonly signal?: AbortSignal
  readonly onConfirmationChange?: (records: readonly ActionConfirmation[]) => void | Promise<void>
}

export interface ResumeChatSessionOptions {
  readonly sessionId: string
  readonly storage: SessionStorage
  readonly now?: () => Date
  readonly signal?: AbortSignal
}

export class SessionConflictError extends Error {
  constructor() { super('Session snapshot changed in another client.'); this.name = 'SessionConflictError' }
}

const invalidConversation = (message: string): never => {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message,
    hint: 'Define valid conversation states, routes, and transition targets.',
  })
}

type ConversationMachineEvent = StatechartEvent<string>
type ConversationMachine = StatechartDefinition<JsonObject, ConversationMachineEvent, string>
type ConversationMachineInstance = StatechartInstance<JsonObject, string>
type ConversationMachineState = StatechartState<JsonObject, ConversationMachineEvent, string>
type ConversationMachineTransition = StatechartTransition<JsonObject, ConversationMachineEvent, string>

const compileConversation = (
  definitionId: string,
  revision: number,
  conversation: ConversationDefinition,
): ConversationMachine => {
  const stateNames = new Set(Object.keys(conversation.states))
  const routeIds = new Set<string>()
  for (const route of conversation.routes) {
    if (route.id.length === 0 || route.event.length === 0) invalidConversation('Conversation route identity is invalid.')
    if (routeIds.has(route.id)) invalidConversation('Conversation route ids must be unique.')
    routeIds.add(route.id)
    for (const state of route.states ?? []) {
      if (!stateNames.has(state)) invalidConversation('Conversation route state is unknown.')
    }
  }

  const states: Record<string, ConversationMachineState> = {}
  for (const [stateName, state] of Object.entries(conversation.states)) {
    const on: Record<string, ConversationMachineTransition> = {}
    for (const [event, target] of Object.entries(state.on ?? {})) on[event] = { target }
    states[stateName] = Object.keys(on).length > 0 ? { on } : {}
  }

  try {
    return defineStatechart<JsonObject, ConversationMachineEvent, string>({
      id: `${definitionId}.conversation`,
      version: String(revision),
      initial: conversation.initial,
      parseContext: input => {
        if (input === null || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length > 0) {
          throw new TypeError('Conversation statechart context must be empty.')
        }
        return {}
      },
      states,
    })
  } catch (error) {
    if (error instanceof StatechartError) invalidConversation(error.message)
    return invalidConversation('Conversation statechart definition is invalid.')
  }
}

const latestUserInput = (request: AdapterRequest): string =>
  request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''

const deterministicSource = (content: string): StreamSource => {
  let aborted = false
  return {
    async *stream() {
      if (aborted) return
      yield { type: 'text', content }
      if (!aborted) yield { type: 'done' }
    },
    abort() { aborted = true },
  }
}

const routeErrorSource = (): StreamSource => ({
  async *stream() { yield { type: 'error', content: 'Deterministic route failed.' } },
  abort() {},
})

interface RouteDecision {
  readonly input: string
  readonly routeId: string
  readonly kind: Exclude<TurnTraceKind, 'agentic'>
  readonly content: string
  readonly fromState: string
  readonly toState: string
}

const wrappedAdapters = new WeakMap<ChatConfig['adapter'], ChatConfig['adapter']>()

export const createChatSession = (definition: ChatDefinition, options: ChatSessionOptions = {}): ChatSession => {
  const revision = definition.revision ?? 1
  if (!Number.isSafeInteger(revision) || revision <= 0) invalidConversation('Chat definition revision is invalid.')
  const sessionId = options.sessionId ?? `${definition.id}:${Date.now().toString(36)}`
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(sessionId)) invalidConversation('Chat session identity is invalid.')
  const restored = options.snapshot
  let confirmations: readonly SessionConfirmation[] = restored?.confirmations ?? []
  let cursor = restored?.cursor ?? 0
  let exists = restored !== undefined
  let activeTurn = restored?.activeTurn
  let terminalTurns: readonly { readonly turnId: string; readonly outcome: 'completed' | 'indeterminate' }[] = restored?.terminalTurns ?? []
  let persistQueue = Promise.resolve()
  const conversation = definition.conversation
  const machine = conversation ? compileConversation(definition.id, revision, conversation) : undefined
  if (!conversation && restored?.conversation) invalidConversation('Session conversation metadata is incompatible with this chat definition.')
  const decisions = new Map<string, RouteDecision>()
  for (const decision of restored?.conversation?.decisions ?? []) {
    decisions.set(decision.messageId, decision)
  }
  const statechartNow = (): string => (options.now?.() ?? new Date()).toISOString()
  const createInitialMachineInstance = (): ConversationMachineInstance | undefined => {
    if (!machine) return undefined
    try {
      return createStatechartInstance(machine, {}, { instanceId: sessionId, now: statechartNow() })
    } catch (error) {
      if (error instanceof StatechartError) invalidConversation(error.message)
      return invalidConversation('Conversation statechart instance is invalid.')
    }
  }
  const transitionDecision = (
    instance: ConversationMachineInstance,
    decision: Pick<RouteDecision, 'routeId' | 'fromState' | 'toState'>,
  ): ConversationMachineInstance | undefined => {
    if (!conversation || !machine || decision.fromState !== instance.state) return undefined
    const route = conversation.routes.find(candidate => candidate.id === decision.routeId)
    if (!route || (route.states !== undefined && !route.states.includes(instance.state))) return undefined
    const result = transitionStatechart(machine, instance, { type: route.event }, { now: statechartNow() })
    return result.status === 'accepted' && result.to === decision.toState ? result.instance : undefined
  }
  let machineInstance = createInitialMachineInstance()
  if (machineInstance && restored?.conversation) {
    let restoredInstance = machineInstance
    for (const decision of restored.conversation.decisions) {
      const next = transitionDecision(restoredInstance, decision)
        ?? invalidConversation('Session conversation metadata is incompatible with this chat definition.')
      restoredInstance = next
    }
    if (restoredInstance.state !== restored.conversation.state) {
      invalidConversation('Session conversation metadata is incompatible with this chat definition.')
    }
    machineInstance = restoredInstance
  }
  const getMachineInstance = (): ConversationMachineInstance =>
    machineInstance ?? invalidConversation('Conversation statechart instance is missing.')
  const buildSnapshot = (nextCursor: number): SessionSnapshot => SessionSnapshotSchema.parse({
    protocol: SESSION_PROTOCOL,
    version: SESSION_PROTOCOL_VERSION,
    sessionId,
    definitionId: definition.id,
    definitionRevision: revision,
    updatedAt: (options.now?.() ?? new Date()).toISOString(),
    cursor: nextCursor,
    ...(activeTurn ? { activeTurn } : {}),
    ...(terminalTurns.length > 0 ? { terminalTurns } : {}),
    ...(conversation ? {
      conversation: {
        state: getMachineInstance().state,
        decisions: [...decisions].map(([messageId, decision]) => ({ messageId, ...decision })),
      },
    } : {}),
    confirmations,
  })
  const persist = (signal?: AbortSignal): Promise<void> => {
    if (!options.storage) { cursor += 1; return Promise.resolve() }
    persistQueue = persistQueue.catch(() => undefined).then(async () => {
      const expectedCursor = exists ? cursor : undefined
      const snapshot = buildSnapshot(cursor + 1)
      if (!(await options.storage!.save(snapshot, expectedCursor, signal ?? options.signal))) throw new SessionConflictError()
      cursor = snapshot.cursor
      exists = true
    })
    return persistQueue
  }
  const createConfirmation = (confirmationOptions: Omit<ActionConfirmationOptions, 'sessionId' | 'initialRecords' | 'onChange' | 'claimStatus'>): ActionConfirmationCoordinator =>
    createActionConfirmation({
      ...confirmationOptions,
      sessionId,
      initialRecords: confirmations,
      onChange: async records => {
        const previous = confirmations
        confirmations = records.map(({ sessionId: _sessionId, ...record }) => record)
        try { await persist() } catch (error) { confirmations = previous; throw error }
        try { void Promise.resolve(options.onConfirmationChange?.(records)).catch(() => undefined) } catch { /* observer isolation */ }
      },
      ...(options.storage ? { claimStatus: async (record: ActionConfirmation, status: Exclude<ActionConfirmationStatus, 'pending'>) => {
        const previous = confirmations
        confirmations = confirmations.map(candidate => candidate.token === record.token ? { ...candidate, status } : candidate)
        try { await persist(); const observed = Object.freeze(confirmations.map(record => Object.freeze({ ...record, sessionId }))); try { void Promise.resolve(options.onConfirmationChange?.(observed)).catch(() => undefined) } catch { /* observer isolation */ }; return true } catch (error) { confirmations = previous; throw error }
      } } : {}),
    })
  const claimTurn = async (turnId: string, leaseMs: number, signal?: AbortSignal): Promise<boolean> => {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(turnId) || !Number.isSafeInteger(leaseMs) || leaseMs <= 0) invalidConversation('Turn claim is invalid.')
    const now = (options.now?.() ?? new Date()).getTime()
    if (terminalTurns.some(turn => turn.turnId === turnId) || (activeTurn && activeTurn.expiresAt > now)) return false
    activeTurn = { turnId, expiresAt: now + leaseMs }
    await persist(signal)
    return true
  }
  const releaseTurn = async (turnId: string, outcome: 'completed' | 'indeterminate', signal?: AbortSignal): Promise<void> => {
    if (activeTurn?.turnId !== turnId) return
    activeTurn = undefined
    terminalTurns = [...terminalTurns.filter(candidate => candidate.turnId !== turnId), { turnId, outcome }].slice(-64)
    await persist(signal)
  }
  if (!conversation) return {
    sessionId,
    definitionId: definition.id,
    definitionRevision: revision,
    chat: definition.chat,
    updateChat: chat => chat,
    getConversationSnapshot: () => undefined,
    createConfirmation,
    persist,
    getCursor: () => cursor,
    claimTurn,
    releaseTurn,
  }
  const conversationMachine = machine ?? invalidConversation('Conversation statechart instance is missing.')
  machineInstance ??= invalidConversation('Conversation statechart instance is missing.')
  const emitTrace = (trace: TurnTrace): void => {
    try {
      void Promise.resolve(conversation.onTrace?.(trace)).catch(() => undefined)
    } catch {
      // Observability must never break dispatch.
    }
  }
  const rebuildState = (messages: readonly Message[]): void => {
    let rebuilt = createInitialMachineInstance()
      ?? invalidConversation('Conversation statechart instance is missing.')
    for (const message of messages) {
      if (message.role !== 'user') continue
      const decision = decisions.get(message.id)
      if (decision?.input !== message.content) continue
      const next = transitionDecision(rebuilt, decision)
      if (next) rebuilt = next
    }
    machineInstance = rebuilt
  }
  const getConversationSnapshot = (): ConversationSnapshot => {
    const instance = getMachineInstance()
    const state = conversation.states[instance.state]!
    return {
      state: instance.state,
      events: Object.keys(state.on ?? {}),
      actions: [...(state.actions ?? [])],
    }
  }
  const schedulePersist = (): void => { void persist().catch(() => undefined) }

  const createSource = (adapter: ChatConfig['adapter'], request: AdapterRequest): StreamSource => {
          const userMessages = request.messages.filter(message => message.role === 'user')
          const userIds = new Set(userMessages.map(message => message.id))
          for (const id of decisions.keys()) {
            if (!userIds.has(id)) decisions.delete(id)
          }
          const userMessage = userMessages.at(-1)
          const input = latestUserInput(request)
          rebuildState(userMessages.slice(0, -1))

          const replay = userMessage === undefined ? undefined : decisions.get(userMessage.id)
          if (userMessage !== undefined && replay?.input === input && replay.fromState === getMachineInstance().state) {
            const next = transitionDecision(getMachineInstance(), replay)
            if (!next) {
              decisions.delete(userMessage.id)
              schedulePersist()
              return routeErrorSource()
            }
            machineInstance = next
            emitTrace({ kind: replay.kind, routeId: replay.routeId, fromState: replay.fromState, toState: replay.toState })
            schedulePersist()
            return deterministicSource(replay.content)
          }
          if (userMessage !== undefined) decisions.delete(userMessage.id)

          const currentState = getMachineInstance().state
          const state = conversationMachine.states[currentState]!
          let route: DeterministicRoute | undefined
          try {
            route = conversation.routes.find(candidate =>
              (candidate.states === undefined || candidate.states.includes(currentState))
              && state.on?.[candidate.event] !== undefined
              && candidate.match(input)
            )
          } catch {
            schedulePersist()
            return routeErrorSource()
          }

          if (!route) {
            emitTrace({ kind: 'agentic', fromState: currentState, toState: currentState })
            schedulePersist()
            return adapter.createSource(request)
          }

          const fromState = currentState
          let content: string
          try {
            content = route.response(input, { sessionId, ...(userMessage ? { messageId: userMessage.id } : {}) })
          } catch {
            schedulePersist()
            return routeErrorSource()
          }
          const transition = transitionStatechart(conversationMachine, getMachineInstance(), { type: route.event }, { now: statechartNow() })
          if (transition.status !== 'accepted') {
            schedulePersist()
            return routeErrorSource()
          }
          machineInstance = transition.instance
          const kind = route.traceKind ?? 'deterministic'
          if (userMessage !== undefined) decisions.set(userMessage.id, {
            input, routeId: route.id, kind, content, fromState, toState: transition.to,
          })
          emitTrace({
            kind,
            routeId: route.id,
            fromState,
            toState: transition.to,
          })
          schedulePersist()
          return deterministicSource(content)
  }
  const updateChat = (chat: ChatConfig): ChatConfig => {
    const adapter = wrappedAdapters.get(chat.adapter) ?? chat.adapter
    const wrapped = { ...adapter, createSource: (request: AdapterRequest) => createSource(adapter, request) }
    wrappedAdapters.set(wrapped, adapter)
    return { ...chat, adapter: wrapped }
  }
  return {
    sessionId,
    definitionId: definition.id,
    definitionRevision: revision,
    chat: updateChat(definition.chat),
    updateChat,
    getConversationSnapshot,
    createConfirmation,
    persist,
    getCursor: () => cursor,
    claimTurn,
    releaseTurn,
  }
}

export const resumeChatSession = async (definition: ChatDefinition, options: ResumeChatSessionOptions): Promise<ChatSession> => {
  const input = await options.storage.load(options.sessionId, options.signal)
  if (input === undefined || input === null) return createChatSession(definition, options)
  const decoded = decodeSessionSnapshot(input)
  if (!decoded.ok) return invalidConversation(decoded.diagnostic.message)
  const snapshot = decoded.snapshot
  if (snapshot.sessionId !== options.sessionId || snapshot.definitionId !== definition.id || snapshot.definitionRevision !== (definition.revision ?? 1)) {
    invalidConversation('Session snapshot is incompatible with this chat definition.')
  }
  return createChatSession(definition, { ...options, snapshot })
}

export const resolveChatSession = (definition: ChatDefinition, session?: ChatSession): ChatSession => {
  if (!session) return createChatSession(definition)
  if (session.definitionId !== definition.id || session.definitionRevision !== (definition.revision ?? 1)) {
    invalidConversation('Prepared session is incompatible with this chat definition.')
  }
  return session
}

export const commandRoute = (options: Omit<DeterministicRoute, 'match'> & { readonly command: string }): DeterministicRoute => {
  if (options.command.length === 0) invalidConversation('Conversation command cannot be empty.')
  const { command, ...route } = options
  return { ...route, match: input => input === command }
}

export const SemanticFallbackSchema = ComponentFallbackSchema

export type SemanticFallback = z.infer<typeof SemanticFallbackSchema>

export const parseSemanticFallback = (input: unknown): SemanticFallback =>
  SemanticFallbackSchema.parse(input)

export const formatSemanticFallback = (fallback: SemanticFallback): string =>
  `[unsupported visual: ${fallback.kind}] ${fallback.summary}`
