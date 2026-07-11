import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterRequest, ChatConfig, ChatReturn, Message, StreamSource, ToolCall } from '@agentskit/core'
import {
  ComponentFallbackSchema,
  ComponentKeySchema,
  createSelectionEvent,
  decodeComponentFrame,
  type ComponentRenderFrame,
  type ComponentSelectionEvent,
} from '@agentskit/chat-protocol'
import { z } from 'zod'

export const CHOICE_LIST_COMPONENT_KEY = 'choice-list' as const

export const ChoiceListPropsSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.object({
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
    label: z.string().min(1),
    description: z.string().min(1).optional(),
    action: z.object({
      name: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/),
      input: z.record(z.string(), z.json()),
    }).readonly().optional(),
  }).readonly()).min(1).max(20).superRefine((choices, context) => {
    const ids = new Set<string>()
    for (const [index, choice] of choices.entries()) {
      if (ids.has(choice.id)) context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Choice ids must be unique.' })
      ids.add(choice.id)
    }
  }),
}).readonly()

export type ChoiceListProps = z.infer<typeof ChoiceListPropsSchema>

export type ChoiceAction = NonNullable<ChoiceListProps['choices'][number]['action']>

export const resolveChoiceAction = (frame: ComponentRenderFrame, choiceId: string): ChoiceAction | undefined => {
  const props = ChoiceListPropsSchema.parse(frame.props)
  return props.choices.find(choice => choice.id === choiceId)?.action
}

export type ActionConfirmationStatus = 'pending' | 'approved' | 'rejected' | 'expired'

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
}

export interface ActionConfirmationOptions {
  readonly sessionId: string
  readonly chat: Pick<ChatReturn, 'proposeToolCall' | 'approve' | 'deny'>
  readonly ttlMs?: number
  readonly now?: () => number
  readonly createId?: () => string
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
      return record
    },
    approve(token, requestedSession) {
      return runOnce(token, async () => {
        const record = requireRecord(token, requestedSession)
        if (record.status !== 'pending') return record
        if (now() >= record.expiresAt) {
          await chat.deny(record.toolCallId, 'confirmation expired')
          const expired = snapshot(record, 'expired')
          records.set(token, expired)
          return expired
        }
        await chat.approve(record.toolCallId)
        const approved = snapshot(record, 'approved')
        records.set(token, approved)
        return approved
      })
    },
    reject(token, requestedSession, reason) {
      return runOnce(token, async () => {
        const record = requireRecord(token, requestedSession)
        if (record.status !== 'pending') return record
        await chat.deny(record.toolCallId, reason)
        const rejected = snapshot(record, 'rejected')
        records.set(token, rejected)
        return rejected
      })
    },
    getByToolCall(toolCallId) {
      const token = tokensByCall.get(toolCallId)
      return token === undefined ? undefined : records.get(token)
    },
  }
}

export interface ComponentDefinition<T> {
  readonly key: string
  readonly propsSchema: z.ZodType<T>
}

export type ComponentManifest = Readonly<Record<string, ComponentDefinition<unknown>>>

export const ChoiceListComponent: ComponentDefinition<ChoiceListProps> = {
  key: CHOICE_LIST_COMPONENT_KEY,
  propsSchema: ChoiceListPropsSchema,
}

export const defineComponentManifest = (
  components: readonly ComponentDefinition<unknown>[],
): ComponentManifest => {
  const manifest: Record<string, ComponentDefinition<unknown>> = Object.create(null) as Record<string, ComponentDefinition<unknown>>
  for (const component of components) {
    if (!ComponentKeySchema.safeParse(component.key).success || Object.hasOwn(manifest, component.key)) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'Component manifest keys must be non-empty and unique.',
        hint: 'Register each application component exactly once.',
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
  readonly response: (input: string) => string
  readonly traceKind?: Exclude<TurnTraceKind, 'agentic'>
}

export interface ConversationDefinition {
  readonly initial: string
  readonly states: Readonly<Record<string, ConversationStateDefinition>>
  readonly routes: readonly DeterministicRoute[]
  readonly onTrace?: (trace: TurnTrace) => void | Promise<void>
}

export interface ChatDefinition {
  readonly id: string
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
  readonly chat: ChatConfig
  readonly updateChat: (chat: ChatConfig) => ChatConfig
  readonly getConversationSnapshot: () => ConversationSnapshot | undefined
}

const invalidConversation = (message: string): never => {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message,
    hint: 'Define valid conversation states, routes, and transition targets.',
  })
}

const validateConversation = (conversation: ConversationDefinition): void => {
  const stateNames = new Set(Object.keys(conversation.states))
  if (!stateNames.has(conversation.initial)) invalidConversation('Conversation initial state is unknown.')

  for (const [stateName, state] of Object.entries(conversation.states)) {
    if (stateName.length === 0) invalidConversation('Conversation state names cannot be empty.')
    for (const target of Object.values(state.on ?? {})) {
      if (!stateNames.has(target)) invalidConversation('Conversation transition target is unknown.')
    }
  }

  const routeIds = new Set<string>()
  for (const route of conversation.routes) {
    if (route.id.length === 0 || route.event.length === 0) invalidConversation('Conversation route identity is invalid.')
    if (routeIds.has(route.id)) invalidConversation('Conversation route ids must be unique.')
    routeIds.add(route.id)
    for (const state of route.states ?? []) {
      if (!stateNames.has(state)) invalidConversation('Conversation route state is unknown.')
    }
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

export const createChatSession = (definition: ChatDefinition): ChatSession => {
  const conversation = definition.conversation
  if (!conversation) return {
    chat: definition.chat,
    updateChat: chat => chat,
    getConversationSnapshot: () => undefined,
  }
  validateConversation(conversation)

  let currentState = conversation.initial
  const decisions = new Map<string, RouteDecision>()
  const emitTrace = (trace: TurnTrace): void => {
    try {
      void Promise.resolve(conversation.onTrace?.(trace)).catch(() => undefined)
    } catch {
      // Observability must never break dispatch.
    }
  }
  const rebuildState = (messages: readonly Message[]): void => {
    currentState = conversation.initial
    for (const message of messages) {
      if (message.role !== 'user') continue
      const decision = decisions.get(message.id)
      if (decision?.input === message.content && decision.fromState === currentState) {
        currentState = decision.toState
      }
    }
  }
  const getConversationSnapshot = (): ConversationSnapshot => {
    const state = conversation.states[currentState]!
    return {
      state: currentState,
      events: Object.keys(state.on ?? {}),
      actions: [...(state.actions ?? [])],
    }
  }

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
          if (replay?.input === input && replay.fromState === currentState) {
            currentState = replay.toState
            emitTrace({ kind: replay.kind, routeId: replay.routeId, fromState: replay.fromState, toState: replay.toState })
            return deterministicSource(replay.content)
          }
          if (userMessage !== undefined) decisions.delete(userMessage.id)

          const state = conversation.states[currentState]!
          let route: DeterministicRoute | undefined
          try {
            route = conversation.routes.find(candidate =>
              (candidate.states === undefined || candidate.states.includes(currentState))
              && state.on?.[candidate.event] !== undefined
              && candidate.match(input)
            )
          } catch {
            return routeErrorSource()
          }

          if (!route) {
            emitTrace({ kind: 'agentic', fromState: currentState, toState: currentState })
            return adapter.createSource(request)
          }

          const fromState = currentState
          const toState = state.on![route.event]!
          let content: string
          try {
            content = route.response(input)
          } catch {
            return routeErrorSource()
          }
          currentState = toState
          const kind = route.traceKind ?? 'deterministic'
          if (userMessage !== undefined) decisions.set(userMessage.id, {
            input, routeId: route.id, kind, content, fromState, toState,
          })
          emitTrace({
            kind,
            routeId: route.id,
            fromState,
            toState: currentState,
          })
          return deterministicSource(content)
  }
  const updateChat = (chat: ChatConfig): ChatConfig => {
    const adapter = wrappedAdapters.get(chat.adapter) ?? chat.adapter
    const wrapped = { ...adapter, createSource: (request: AdapterRequest) => createSource(adapter, request) }
    wrappedAdapters.set(wrapped, adapter)
    return { ...chat, adapter: wrapped }
  }
  return {
    chat: updateChat(definition.chat),
    updateChat,
    getConversationSnapshot,
  }
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
