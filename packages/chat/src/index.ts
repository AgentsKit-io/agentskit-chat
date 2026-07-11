import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterRequest, ChatConfig, Message, StreamSource } from '@agentskit/core'
import { z } from 'zod'

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

export const SemanticFallbackSchema = z.object({
  kind: z.string().min(1),
  summary: z.string().min(1),
}).readonly()

export type SemanticFallback = z.infer<typeof SemanticFallbackSchema>

export const parseSemanticFallback = (input: unknown): SemanticFallback =>
  SemanticFallbackSchema.parse(input)

export const formatSemanticFallback = (fallback: SemanticFallback): string =>
  `[unsupported visual: ${fallback.kind}] ${fallback.summary}`
