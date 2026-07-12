import { ChoiceListComponent, commandRoute, createCapabilityPolicy, createChatSession, defineChat, defineComponentManifest, withActionPolicy } from '@agentskit/chat'
import { defineTool, type AdapterFactory, type ToolDefinition } from '@agentskit/core'
import { createAjvValidator } from '@agentskit/validation'

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
