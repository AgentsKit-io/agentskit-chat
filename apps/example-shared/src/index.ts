import { ChoiceListComponent, FormComponent, SourceListComponent, SourceListPropsSchema, commandRoute, createCapabilityPolicy, createChatSession, defineChat, defineComponentManifest, validateStandardComponentInteraction, withActionPolicy, type DeterministicRoute } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentSelectionEvent } from '@agentskit/chat/protocol'
import { captureActionPolicyTrace, captureActionTrace, createTraceCapture } from '@agentskit/chat/devtools'
import { defineTool, type AdapterFactory, type ToolDefinition } from '@agentskit/core'
import { createAjvValidator } from '@agentskit/validation'
import { createRAG, type RAG } from '@agentskit/rag'
import type { RetrievedDocument, VectorMemory } from '@agentskit/core'

const deterministicAdapter: AdapterFactory = {
  createSource: request => {
    let aborted = false
    let release: (() => void) | undefined
    return {
      async *stream() {
        const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
        if (prompt === '/fail') {
          yield { type: 'error', content: 'The deterministic adapter failed as requested.' }
          return
        }
        if (prompt === '/slow') await new Promise<void>(resolve => { release = resolve })
        if (!aborted) yield { type: 'text', content: `AgentsKit received: ${prompt}` }
        if (!aborted) yield { type: 'done' }
      },
      abort() {
        aborted = true
        release?.()
      },
    }
  },
}

// Compatibility fixture retained for lifecycle and protocol regression consumers.
export const helloWorldChat = defineChat({
  id: 'hello-world', components: defineComponentManifest([ChoiceListComponent]),
  chat: withActionPolicy({ adapter: deterministicAdapter, tools: [{ name: 'restricted-action', requiresConfirmation: true, execute: () => undefined }] }, createCapabilityPolicy({
    sessionId: 'example', getContext: () => undefined, requirements: { 'restricted-action': ['example.restricted'] },
  })),
  conversation: {
    initial: 'idle', states: {
      idle: { on: { start: 'collecting', restricted: 'idle' }, actions: ['start', 'restricted'] },
      collecting: { on: { finish: 'complete' }, actions: ['cancel'] }, complete: { actions: ['restart'] },
    }, routes: [
      commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
      commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
      commandRoute({ id: 'restricted', command: '/restricted', event: 'restricted', response: () => JSON.stringify({
        protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'choice-list', instanceId: 'restricted-choice',
        props: { prompt: 'Restricted action', choices: [{ id: 'run', label: 'Run restricted action', action: { name: 'restricted-action', input: {} } }] },
        fallback: { kind: 'choice-list', summary: 'Restricted action is unavailable.' },
      }) }),
    ],
  },
})

export interface SupportHostContext {
  readonly sessionId: string
  readonly customerId: string
  readonly capabilities: readonly string[]
}

export interface TicketInput {
  readonly subject: string
  readonly priority: 'normal' | 'urgent'
}

export interface TicketRecord extends TicketInput {
  readonly id: string
  readonly customerId: string
}

export interface TicketService {
  createTicket(input: TicketInput, context: SupportHostContext): Promise<TicketRecord>
}

export interface SupportApplicationOptions {
  readonly context: SupportHostContext
  readonly ticketService: TicketService
  readonly adapter?: AdapterFactory
}

export const createInMemoryTicketService = (): TicketService & { readonly tickets: readonly TicketRecord[] } => {
  const tickets: TicketRecord[] = []
  return {
    tickets,
    createTicket: async (input, context) => {
      const ticket = Object.freeze({ id: `SUP-${tickets.length + 1}`, customerId: context.customerId, ...input })
      tickets.push(ticket)
      return ticket
    },
  }
}

const ticketSchema = {
  type: 'object', additionalProperties: false,
  properties: { subject: { type: 'string', minLength: 1, maxLength: 160 }, priority: { type: 'string', enum: ['normal', 'urgent'] } },
  required: ['subject', 'priority'],
} as const

export const createSupportApplication = ({ context, ticketService, adapter = deterministicAdapter }: SupportApplicationOptions) => {
  const createTicket = defineTool({
    name: 'create-support-ticket', description: 'Create a support ticket after user confirmation.', schema: ticketSchema, requiresConfirmation: true,
    execute: async input => {
      const ticket = await ticketService.createTicket({ subject: input.subject, priority: input.priority as TicketInput['priority'] }, context)
      return `Ticket ${ticket.id} created for follow-up.`
    },
  }) as ToolDefinition
  const policy = createCapabilityPolicy({
    sessionId: context.sessionId,
    getContext: () => ({ sessionId: context.sessionId, capabilities: context.capabilities }),
    requirements: { 'create-support-ticket': ['support.ticket.create'] },
  })
  return defineChat({
    id: 'support-reference',
    components: defineComponentManifest([ChoiceListComponent]),
    chat: withActionPolicy({ adapter, tools: [createTicket], validateArgs: createAjvValidator() }, policy),
    conversation: {
      initial: 'ready', states: {
        ready: { on: { support: 'ready', start: 'collecting' }, actions: ['support', 'start'] },
        collecting: { on: { finish: 'ready' }, actions: ['finish'] },
      },
      routes: [
        commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
        commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
        commandRoute({
        id: 'support-ticket', command: '/support', event: 'support', response: (_input, route) => JSON.stringify({
          protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'choice-list', instanceId: `support-ticket-choice-${route.messageId ?? route.sessionId}`,
          props: { prompt: 'Would you like a human support specialist to follow up?', choices: [
            { id: 'create', label: 'Open support ticket', description: 'Requires confirmation before creation.', action: { name: 'create-support-ticket', input: { subject: 'Chat follow-up requested', priority: 'normal' } } },
            { id: 'continue', label: 'Keep chatting' },
          ] },
          fallback: { kind: 'choice-list', summary: 'Open a support ticket or keep chatting.' },
        }),
        }),
      ],
    },
  })
}

export const supportTicketService = createInMemoryTicketService()
export const supportHostContext: SupportHostContext = Object.freeze({ sessionId: 'support-demo', customerId: 'customer-demo', capabilities: ['support.ticket.create'] })
export const supportChat = createSupportApplication({ context: supportHostContext, ticketService: supportTicketService })
export const supportSession = createChatSession(supportChat, { sessionId: supportHostContext.sessionId })

export interface OnboardingProfile {
  readonly role: 'engineering' | 'product' | 'support'
  readonly goal: string
}

export interface OnboardingRecommendation {
  readonly title: string
  readonly description: string
}

export interface RecommendationService {
  recommend(profile: OnboardingProfile): OnboardingRecommendation
}

const onboardingContext: SupportHostContext = Object.freeze({ sessionId: 'onboarding-demo', customerId: 'onboarding-demo', capabilities: ['onboarding.complete'] })

export interface OnboardingApplicationOptions {
  readonly context: SupportHostContext
  readonly recommendations?: RecommendationService
}

const defaultRecommendations: RecommendationService = { recommend: profile => ({ title: `${profile.role} starter`, description: `A guided workspace for ${profile.goal}.` }) }
const onboardingFormProps = {
  title: 'Tell us how you work', submitLabel: 'Save answers', fields: [
    { id: 'role', label: 'Primary role', type: 'select', required: true, options: [
      { id: 'engineering', label: 'Engineering' }, { id: 'product', label: 'Product' }, { id: 'support', label: 'Support' },
    ] },
    { id: 'goal', label: 'First goal', type: 'text', required: true, placeholder: 'Automate customer handoffs' },
  ],
} as const

export const createOnboardingApplication = ({ context, recommendations = defaultRecommendations }: OnboardingApplicationOptions) => {
  let profile: OnboardingProfile | undefined
  let decision: 'accept' | 'revise' | undefined
  let completed = false
  let activeFormId: string | undefined
  let activeRecommendationId: string | undefined
  const frame = (componentKey: string, instanceId: string, props: object, fallback: string): string => JSON.stringify({
    protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey, instanceId, props,
    fallback: { kind: 'text', summary: fallback },
  })
  const form = (identity: string): string => {
    activeFormId = `onboarding-form-${identity}`
    activeRecommendationId = undefined
    completed = false
    return frame('form', activeFormId, onboardingFormProps, 'Collect your primary role and first goal.')
  }
  const completeTool = defineTool({
    name: 'complete-onboarding', description: 'Complete onboarding after explicit confirmation.', schema: { type: 'object', additionalProperties: false }, requiresConfirmation: true,
    execute: () => { completed = true; return 'Onboarding confirmed.' },
  }) as ToolDefinition
  const guardedRoute = (route: Omit<DeterministicRoute, 'match'> & { command: string; guard: () => boolean }): DeterministicRoute => ({
    ...route, match: input => input === route.command && route.guard(),
  })
  const definition = defineChat({
    id: 'onboarding-reference', components: defineComponentManifest([FormComponent, ChoiceListComponent]),
    chat: withActionPolicy({ adapter: deterministicAdapter, tools: [completeTool], validateArgs: createAjvValidator() }, createCapabilityPolicy({
      sessionId: context.sessionId, getContext: () => context, requirements: { 'complete-onboarding': ['onboarding.complete'] },
    })),
    conversation: {
      initial: 'welcome', states: {
        welcome: { on: { begin: 'collecting' }, actions: ['begin'] },
        collecting: { on: { recommend: 'review' }, actions: ['recommend'] },
        review: { on: { accept: 'confirming', revise: 'collecting' }, actions: ['accept', 'revise'] },
        confirming: { on: { done: 'complete', revise: 'collecting' }, actions: ['done', 'revise'] },
        complete: {},
      }, routes: [
        commandRoute({ id: 'begin', command: '/onboarding', event: 'begin', response: (_input, context) => form(context.messageId ?? context.sessionId) }),
        guardedRoute({ id: 'recommend', command: '/recommend', event: 'recommend', guard: () => profile !== undefined, response: (_input, context) => {
          const item = recommendations.recommend(profile!)
          activeFormId = undefined
          activeRecommendationId = `onboarding-recommendation-${context.messageId ?? context.sessionId}`
          return frame('choice-list', activeRecommendationId, { prompt: item.title, choices: [
            { id: 'accept', label: 'Use this setup', description: item.description }, { id: 'revise', label: 'Revise answers' },
          ] }, `${item.title}: ${item.description}`)
        } }),
        guardedRoute({ id: 'accept', command: '/accept', event: 'accept', guard: () => decision === 'accept', response: (_input, context) => { activeRecommendationId = undefined; return frame('choice-list', `onboarding-complete-${context.messageId ?? context.sessionId}`, {
          prompt: 'Ready to create your workspace?', choices: [{ id: 'complete', label: 'Complete onboarding', action: { name: 'complete-onboarding', input: {} } }],
        }, 'Confirm onboarding completion.') } }),
        guardedRoute({ id: 'revise', command: '/revise', event: 'revise', states: ['review', 'confirming'], guard: () => decision === 'revise' || profile !== undefined, response: (_input, context) => { profile = undefined; decision = undefined; completed = false; return form(context.messageId ?? context.sessionId) } }),
        guardedRoute({ id: 'done', command: '/done', event: 'done', guard: () => completed, response: () => 'Onboarding complete. Your guided workspace is ready.' }),
      ],
    },
  })
  const session = createChatSession(definition, { sessionId: context.sessionId })
  return {
    definition, session,
    onComponentInteract: (event: ComponentInteractionEvent) => {
      if (session.getConversationSnapshot()?.state !== 'collecting' || event.instanceId !== activeFormId || event.componentKey !== 'form' || event.event !== 'submit' || typeof event.value !== 'object' || event.value === null) return
      if (!validateStandardComponentInteraction('form', onboardingFormProps, 'submit', event.value)) return
      const value = event.value as Record<string, unknown>
      if ((value.role === 'engineering' || value.role === 'product' || value.role === 'support') && typeof value.goal === 'string' && value.goal.trim()) profile = { role: value.role, goal: value.goal.trim() }
    },
    onComponentSelect: (event: ComponentSelectionEvent) => {
      if (session.getConversationSnapshot()?.state === 'review' && event.instanceId === activeRecommendationId && (event.choiceId === 'accept' || event.choiceId === 'revise')) decision = event.choiceId
    },
  }
}

export const onboardingApplication = createOnboardingApplication({ context: onboardingContext })

export interface OperationStatus { readonly id: string; readonly status: 'healthy' | 'degraded'; readonly revision: number }
export interface OperationsService {
  readStatus(id: string): Promise<OperationStatus>
  restart(id: string, idempotencyKey: string): Promise<OperationStatus>
}
export interface OperationsApplicationOptions { readonly context: SupportHostContext; readonly service: OperationsService }

export const createInMemoryOperationsService = (): OperationsService & { readonly restarts: readonly string[] } => {
  const restarts: string[] = []
  const results = new Map<string, OperationStatus>()
  return {
    restarts,
    readStatus: async id => ({ id, status: 'healthy', revision: restarts.length + 1 }),
    restart: async (id, idempotencyKey) => { const prior = results.get(idempotencyKey); if (prior) return prior; restarts.push(id); const result = { id, status: 'healthy', revision: restarts.length + 1 } as const; results.set(idempotencyKey, result); return result },
  }
}

export const createOperationsApplication = ({ context, service }: OperationsApplicationOptions) => {
  const traces = createTraceCapture({ redactFields: ['token', 'secret', 'credential'] })
  const operationSchema = { type: 'object', additionalProperties: false, properties: { id: { type: 'string', pattern: '^[a-z][a-z0-9-]{0,63}$' } }, required: ['id'] } as const
  const parseStatus = (value: unknown): OperationStatus => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid operation status')
    const item = value as Record<string, unknown>
    if (Object.keys(item).some(key => !['id', 'status', 'revision'].includes(key)) || typeof item.id !== 'string' || (item.status !== 'healthy' && item.status !== 'degraded') || !Number.isSafeInteger(item.revision) || (item.revision as number) < 0) throw new TypeError('Invalid operation status')
    return item as unknown as OperationStatus
  }
  const readStatus = defineTool({
    name: 'read-operation-status', description: 'Read the current operation status after operator confirmation.', schema: operationSchema, requiresConfirmation: true,
    execute: async (input, execution) => {
      const result = parseStatus(await service.readStatus(input.id))
      traces.append({ category: 'lifecycle', detail: { action: 'read-operation-status', phase: 'result', toolCallId: execution.call.id, operationId: result.id, status: result.status, revision: result.revision } })
      return `${result.id} is ${result.status} at revision ${result.revision}.`
    },
  }) as ToolDefinition
  const restart = defineTool({
    name: 'restart-operation', description: 'Restart an operation after explicit confirmation.', schema: operationSchema, requiresConfirmation: true,
    execute: async (input, execution) => {
      traces.append({ category: 'action', detail: { action: 'restart-operation', phase: 'confirmed-execution', toolCallId: execution.call.id, operationId: input.id } })
      try {
        const raw = await service.restart(input.id, `${context.sessionId}:${execution.call.id}`)
        let result: OperationStatus
        try { result = parseStatus(raw) } catch { try { traces.append({ category: 'lifecycle', detail: { action: 'restart-operation', phase: 'result-invalid', toolCallId: execution.call.id } }) } catch { /* observer isolation */ }; return `${input.id} restart accepted.` }
        try { traces.append({ category: 'lifecycle', detail: { action: 'restart-operation', phase: 'result', toolCallId: execution.call.id, operationId: result.id, status: result.status, revision: result.revision } }) } catch { /* post-commit audit observer isolation */ }
        return `${result.id} restarted at revision ${result.revision}.`
      } catch (error) {
        try { traces.append({ category: 'lifecycle', detail: { action: 'restart-operation', phase: 'error', toolCallId: execution.call.id, errorType: error instanceof Error ? error.name : 'UnknownError' } }) } catch { /* observer isolation */ }
        throw error
      }
    },
  }) as ToolDefinition
  const policy = createCapabilityPolicy({
    sessionId: context.sessionId, getContext: () => context,
    requirements: { 'read-operation-status': ['operations.read'], 'restart-operation': ['operations.restart'] },
    onTrace: trace => { captureActionPolicyTrace(traces, trace) },
  })
  const definition = defineChat({
    id: 'operations-reference', components: defineComponentManifest([ChoiceListComponent]),
    chat: withActionPolicy({ adapter: deterministicAdapter, tools: [readStatus, restart], validateArgs: createAjvValidator() }, policy),
    conversation: { initial: 'ready', states: { ready: { on: { operations: 'ready' }, actions: ['operations'] } }, routes: [
      commandRoute({ id: 'operations', command: '/operations', event: 'operations', response: (_input, route) => JSON.stringify({
        protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'choice-list', instanceId: `operations-${route.messageId ?? route.sessionId}`,
        props: { prompt: 'Operation checkout-api', choices: [
          { id: 'status', label: 'Read status', action: { name: 'read-operation-status', input: { id: 'checkout-api' } } },
          { id: 'restart', label: 'Restart operation', description: 'Requires restart capability and confirmation.', action: { name: 'restart-operation', input: { id: 'checkout-api' } } },
        ] }, fallback: { kind: 'choice-list', summary: 'Read or restart checkout-api.' },
      }) }),
    ] },
  })
  const confirmationStatuses = new Set<string>()
  const session = createChatSession(definition, { sessionId: context.sessionId, onConfirmationChange: records => {
    for (const record of records) {
      const key = `${record.token}:${record.status}`
      if (!confirmationStatuses.has(key)) { confirmationStatuses.add(key); captureActionTrace(traces, record) }
    }
  } })
  return { definition, session, traces: () => traces.snapshot() }
}

const operationsContext: SupportHostContext = Object.freeze({ sessionId: 'operations-demo', customerId: 'operator-demo', capabilities: ['operations.read', 'operations.restart'] })
export const operationsApplication = createOperationsApplication({ context: operationsContext, service: createInMemoryOperationsService() })
export const unauthorizedOperationsApplication = createOperationsApplication({ context: { ...operationsContext, sessionId: 'operations-unauthorized', capabilities: [] }, service: createInMemoryOperationsService() })

export interface RagApplicationOptions {
  readonly rag: RAG
  readonly answer?: (query: string, documents: readonly RetrievedDocument[]) => string | Promise<string> | AsyncIterable<string>
}

export const createRagApplication = ({ rag, answer = (query, documents) => `Grounded answer for “${query}”: ${documents[0]?.content ?? ''}` }: RagApplicationOptions) => {
  let activeSources: { readonly instanceId: string; readonly props: ReturnType<typeof SourceListPropsSchema.parse> } | undefined
  const resolveAnswer = async (value: string | Promise<string> | AsyncIterable<string>): Promise<string> => {
    const resolved = await value
    if (typeof resolved === 'string') return resolved.slice(0, 256)
    let text = ''
    for await (const chunk of resolved) text = `${text}${chunk}`.slice(0, 256)
    return text
  }
  const adapter: AdapterFactory = { createSource: request => ({
    async *stream() {
      const query = request.messages.filter(message => message.role === 'user').at(-1)?.content.trim() ?? ''
      try {
        const documents = await rag.retrieve({ query, messages: request.messages })
        if (documents.length === 0) { yield { type: 'text', content: 'No grounded sources were found for this question.' }; yield { type: 'done' }; return }
        const sourceIds = new Set<string>()
        const sources = documents.slice(0, 50).flatMap(document => {
          const title = typeof document.metadata?.title === 'string' ? document.metadata.title.slice(0, 256) : (document.source ?? document.id).slice(0, 256)
          const rawUrl = typeof document.metadata?.url === 'string' ? document.metadata.url : document.source
          if (typeof rawUrl === 'string' && !/^https?:\/\//.test(rawUrl) && !rawUrl.startsWith('/')) return []
          const url = typeof rawUrl === 'string' ? rawUrl : undefined
          const source = { id: document.id.slice(0, 128), title, snippet: document.content.slice(0, 4_096), ...(url ? { url } : {}) }
          if (sourceIds.has(source.id) || !SourceListPropsSchema.safeParse({ label: 'Source', sources: [source] }).success) return []
          sourceIds.add(source.id)
          return [source]
        })
        if (sources.length === 0) { yield { type: 'text', content: 'No safe grounded sources were found for this question.' }; yield { type: 'done' }; return }
        const props = SourceListPropsSchema.parse({ label: await resolveAnswer(answer(query, documents)), sources })
        const instanceId = `rag-${request.messages.at(-1)?.id ?? 'answer'}`
        activeSources = { instanceId, props }
        const summary = `${props.label} Sources: ${props.sources.map(source => source.title).join(', ')}.`.slice(0, 4_096)
        const frame = JSON.stringify({ protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'source-list', instanceId, props, fallback: { kind: 'source-list', summary } })
        for (let offset = 0; offset < frame.length; offset += 64) yield { type: 'text', content: frame.slice(offset, offset + 64) }
        yield { type: 'done' }
      } catch { yield { type: 'error', content: 'Grounded retrieval is temporarily unavailable.' } }
    }, abort() {},
  }) }
  const definition = defineChat({ id: 'rag-reference', components: defineComponentManifest([SourceListComponent]), chat: { adapter } })
  return {
    ...definition,
    resolveSourceInteraction: (event: ComponentInteractionEvent): string | undefined => {
      if (!activeSources || event.instanceId !== activeSources.instanceId || event.componentKey !== 'source-list' || !validateStandardComponentInteraction('source-list', activeSources.props, event.event, event.value)) return undefined
      return activeSources.props.sources.find(source => source.id === event.value)?.url
    },
  }
}

const ragDocuments: RetrievedDocument[] = [{ id: 'agentskit-chat', content: 'AgentsKit Chat shares one definition across native framework renderers.', source: 'https://www.agentskit.io/docs/chat', score: 1, metadata: { title: 'AgentsKit Chat overview', url: 'https://www.agentskit.io/docs/chat' } }]
const ragStore: VectorMemory = { store: () => undefined, search: embedding => embedding[0] === 0 ? [] : ragDocuments }
const demoRag = createRAG({ embed: async text => [text.toLowerCase().includes('unknown') ? 0 : 1], store: ragStore })
export const ragChat = createRagApplication({ rag: demoRag })
export const ragSession = createChatSession(ragChat, { sessionId: 'rag-demo' })
