import { createActionConfirmation, createChatSession } from '@agentskit/chat'
import { createChatController } from '@agentskit/core'
import { createRAG } from '@agentskit/rag'
import { describe, expect, it, vi } from 'vitest'
import { createInMemoryOperationsService, createInMemoryTicketService, createOnboardingApplication, createOperationsApplication, createRagApplication, createSupportApplication, helloWorldChat, type OperationsService, type SupportHostContext, type TicketService } from '../src/index.js'

const context: SupportHostContext = { sessionId: 'test-session', customerId: 'customer-1', capabilities: ['support.ticket.create'] }
const ticketInput = { subject: 'Need help', priority: 'urgent' } as const

describe('support reference domain', () => {
  it('retains the hello-world lifecycle compatibility fixture', async () => {
    const controller = createChatController(createChatSession(helloWorldChat, { sessionId: 'example' }).chat)
    await controller.send('/start')
    expect(controller.getState().messages.at(-1)?.content).toBe('What is your name?')
    await controller.send('/name Ada')
    expect(controller.getState().messages.at(-1)?.content).toBe('Welcome, Ada.')
    await controller.send('hello')
    expect(controller.getState().messages.at(-1)?.content).toBe('AgentsKit received: hello')
  })

  it('answers questions and renders support routes through the shared session', async () => {
    const definition = createSupportApplication({ context, ticketService: createInMemoryTicketService() })
    const controller = createChatController(createChatSession(definition, { sessionId: context.sessionId }).chat)
    await controller.send('How do I update billing?')
    expect(controller.getState().messages.at(-1)?.content).toContain('AgentsKit received: How do I update billing?')
    await controller.send('/support')
    const firstSupport = controller.getState().messages.at(-1)?.content
    expect(firstSupport).toContain('Open support ticket')
    await controller.send('/support')
    const secondSupport = controller.getState().messages.at(-1)?.content
    expect(secondSupport).toContain('Open support ticket')
    expect(secondSupport).not.toBe(firstSupport)
    await controller.send('/start')
    expect(controller.getState().messages.at(-1)?.content).toBe('What is your name?')
    await controller.send('/name Ada')
    expect(controller.getState().messages.at(-1)?.content).toBe('Welcome, Ada.')
  })

  it('keeps the demo ticket service injectable and deterministic', async () => {
    const service = createInMemoryTicketService()
    await expect(service.createTicket(ticketInput, context)).resolves.toMatchObject({ id: 'SUP-1', customerId: 'customer-1' })
    expect(service.tickets).toHaveLength(1)
  })

  it('executes an injected ticket service only after typed confirmation', async () => {
    const service = { createTicket: vi.fn(async input => ({ id: 'SUP-1', customerId: context.customerId, ...input })) }
    const definition = createSupportApplication({ context, ticketService: service })
    const controller = createChatController(definition.chat)
    const confirmation = createActionConfirmation({ sessionId: context.sessionId, chat: controller, createId: () => 'ticket', now: () => 0 })
    const pending = await confirmation.propose({ name: 'create-support-ticket', input: ticketInput })
    expect(service.createTicket).not.toHaveBeenCalled()
    expect((await confirmation.approve(pending.token, context.sessionId)).status).toBe('approved')
    expect(service.createTicket).toHaveBeenCalledWith(ticketInput, context)
  })

  it('does not execute the ticket service twice for a repeated approval', async () => {
    const service = { createTicket: vi.fn(async input => ({ id: 'SUP-1', customerId: context.customerId, ...input })) }
    const controller = createChatController(createSupportApplication({ context, ticketService: service }).chat)
    const confirmation = createActionConfirmation({ sessionId: context.sessionId, chat: controller, createId: () => 'duplicate', now: () => 0 })
    const pending = await confirmation.propose({ name: 'create-support-ticket', input: ticketInput })
    await confirmation.approve(pending.token, context.sessionId)
    expect((await confirmation.approve(pending.token, context.sessionId)).status).toBe('approved')
    expect(service.createTicket).toHaveBeenCalledTimes(1)
  })

  it('surfaces ticket-service failures through the upstream tool result', async () => {
    const failure = new Error('ticket store unavailable')
    const service: TicketService = { createTicket: vi.fn(async () => { throw failure }) }
    const controller = createChatController(createSupportApplication({ context, ticketService: service }).chat)
    const confirmation = createActionConfirmation({ sessionId: context.sessionId, chat: controller, createId: () => 'failure', now: () => 0 })
    const pending = await confirmation.propose({ name: 'create-support-ticket', input: ticketInput })
    expect((await confirmation.approve(pending.token, context.sessionId)).status).toBe('approved')
    const toolCall = controller.getState().messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === pending.toolCallId)
    expect(toolCall).toMatchObject({ status: 'error' })
    expect(toolCall?.error).toContain(failure.message)
  })

  it('keeps rejection and missing host capability inert', async () => {
    const service = createInMemoryTicketService()
    const denied = createSupportApplication({ context: { ...context, capabilities: [] }, ticketService: service })
    await expect(createChatController(denied.chat).proposeToolCall({ id: 'denied', name: 'create-support-ticket', args: ticketInput })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    const controller = createChatController(createSupportApplication({ context, ticketService: service }).chat)
    const confirmation = createActionConfirmation({ sessionId: context.sessionId, chat: controller, createId: () => 'reject', now: () => 0 })
    const pending = await confirmation.propose({ name: 'create-support-ticket', input: ticketInput })
    expect((await confirmation.reject(pending.token, context.sessionId)).status).toBe('rejected')
    expect(service.tickets).toHaveLength(0)
  })

  it('rejects malformed ticket input at the upstream validation boundary', async () => {
    const definition = createSupportApplication({ context, ticketService: createInMemoryTicketService() })
    await expect(createChatController(definition.chat).proposeToolCall({ id: 'invalid', name: 'create-support-ticket', args: { subject: '', priority: 'critical' } })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
  })
})

describe('cited RAG reference domain', () => {
  it('uses real AgentsKit RAG ingestion and retrieval to emit a validated SourceList', async () => {
    const stored: Array<{ id: string; content: string; metadata?: Record<string, unknown> }> = []
    const rag = createRAG({ embed: async () => [1], store: { store: documents => { stored.push(...documents) }, search: () => stored.map(document => ({ ...document, source: String(document.metadata?.source), score: 1 })) } })
    await rag.ingest([{ id: 'guide', content: 'One definition works across native renderers.', source: 'https://docs.example.dev/guide', metadata: { title: 'Native renderer guide', url: 'https://docs.example.dev/guide' } }])
    const definition = createRagApplication({ rag, answer: () => 'Use one shared definition.' })
    const controller = createChatController(definition.chat)
    await controller.send('How do renderers stay aligned?')
    const frame = JSON.parse(controller.getState().messages.at(-1)?.content ?? '{}') as { componentKey?: string; props?: { label?: string; sources?: Array<{ title?: string; url?: string }> } }
    expect(frame.componentKey).toBe('source-list')
    expect(frame.props?.label).toBe('Use one shared definition.')
    expect(frame.props?.sources?.[0]).toMatchObject({ title: 'Native renderer guide', url: 'https://docs.example.dev/guide' })
  })

  it('does not fabricate citations for empty or unsafe retrieval results', async () => {
    const empty = createRagApplication({ rag: { ingest: async () => undefined, search: async () => [], retrieve: async () => [] } })
    const emptyController = createChatController(empty.chat)
    await emptyController.send('unknown')
    expect(emptyController.getState().messages.at(-1)?.content).toContain('No grounded sources')
    const unsafe = createRagApplication({ rag: { ingest: async () => undefined, search: async () => [], retrieve: async () => [{ id: 'bad id', content: 'x', source: 'javascript:alert(1)', metadata: { title: 'Unsafe' } }] } })
    const unsafeController = createChatController(unsafe.chat)
    await unsafeController.send('unsafe')
    expect(unsafeController.getState().messages.at(-1)?.content).toContain('No safe grounded sources')
  })

  it('turns retrieval failures into an opaque upstream stream error', async () => {
    const definition = createRagApplication({ rag: { ingest: async () => undefined, search: async () => [], retrieve: async () => { throw new Error('private vector credential') } } })
    const controller = createChatController(definition.chat)
    await controller.send('fail')
    expect(controller.getState()).toMatchObject({ status: 'error' })
    expect(JSON.stringify(controller.getState())).not.toContain('private vector credential')
  })
})

describe('operations reference domain', () => {
  const operator = (capabilities: readonly string[], service: OperationsService = createInMemoryOperationsService()) => createOperationsApplication({
    context: { sessionId: `ops-${capabilities.join('-') || 'none'}`, customerId: 'operator-1', capabilities }, service,
  })

  it('enforces read and restart capabilities independently', async () => {
    const readOnly = operator(['operations.read'])
    await expect(createChatController(readOnly.definition.chat).proposeToolCall({ id: 'read', name: 'read-operation-status', args: { id: 'checkout-api' } })).resolves.toMatchObject({ status: 'requires_confirmation' })
    await expect(createChatController(readOnly.definition.chat).proposeToolCall({ id: 'restart', name: 'restart-operation', args: { id: 'checkout-api' } })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    const restartOnly = operator(['operations.restart'])
    await expect(createChatController(restartOnly.definition.chat).proposeToolCall({ id: 'forbidden-read', name: 'read-operation-status', args: { id: 'checkout-api' } })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    await expect(createChatController(restartOnly.definition.chat).proposeToolCall({ id: 'allowed-restart', name: 'restart-operation', args: { id: 'checkout-api' } })).resolves.toMatchObject({ status: 'requires_confirmation' })
  })

  it('executes an approved restart exactly once and captures a safe causal trace', async () => {
    const service = createInMemoryOperationsService()
    const application = operator(['operations.read', 'operations.restart'], service)
    const controller = createChatController(application.definition.chat)
    const confirmation = application.session.createConfirmation({ chat: controller, createId: () => 'restart', now: () => 0 })
    const pending = await confirmation.propose({ name: 'restart-operation', input: { id: 'checkout-api' } })
    expect(service.restarts).toHaveLength(0)
    await Promise.all([confirmation.approve(pending.token, application.session.sessionId), confirmation.approve(pending.token, application.session.sessionId)])
    expect(service.restarts).toEqual(['checkout-api'])
    expect(application.traces().map(record => `${record.category}:${String(record.detail.status ?? record.detail.phase)}`)).toEqual([
      'policy:propose', 'action:pending', 'action:approving', 'policy:execute', 'action:confirmed-execution', 'lifecycle:healthy', 'action:approved',
    ])
    expect(JSON.stringify(application.traces())).not.toMatch(/token|secret|credential/i)
  })

  it('keeps malformed, rejected, and cross-session proposals inert', async () => {
    const service = createInMemoryOperationsService()
    const application = operator(['operations.restart'], service)
    const controller = createChatController(application.definition.chat)
    await expect(controller.proposeToolCall({ id: 'malformed', name: 'restart-operation', args: { id: 'Checkout API', extra: true } })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    const confirmation = application.session.createConfirmation({ chat: controller, createId: () => 'reject', now: () => 0 })
    const pending = await confirmation.propose({ name: 'restart-operation', input: { id: 'checkout-api' } })
    await expect(confirmation.approve(pending.token, 'foreign-session')).rejects.toBeDefined()
    await confirmation.reject(pending.token, application.session.sessionId)
    expect(service.restarts).toHaveLength(0)
    expect(application.traces().filter(record => record.category === 'action').map(record => record.detail.status)).toEqual(['pending', 'rejecting', 'rejected'])
  })

  it('surfaces service failure as an upstream tool error without tracing secrets', async () => {
    const service: OperationsService = { readStatus: async () => { throw new Error('credential=private') }, restart: async () => { throw new TypeError('secret value') } }
    const application = operator(['operations.restart'], service)
    const controller = createChatController(application.definition.chat)
    const confirmation = application.session.createConfirmation({ chat: controller, createId: () => 'failure', now: () => 0 })
    const pending = await confirmation.propose({ name: 'restart-operation', input: { id: 'checkout-api' } })
    await confirmation.approve(pending.token, application.session.sessionId)
    const call = controller.getState().messages.flatMap(message => message.toolCalls ?? []).find(tool => tool.id === pending.toolCallId)
    expect(call?.status).toBe('error')
    expect(JSON.stringify(application.traces())).not.toContain('secret value')
  })
})

describe('onboarding reference domain', () => {
  let onboardingSequence = 0
  const onboarding = (recommendations?: Parameters<typeof createOnboardingApplication>[0]['recommendations']) => createOnboardingApplication({
    context: { sessionId: `onboarding-test-${++onboardingSequence}`, customerId: 'customer-1', capabilities: ['onboarding.complete'] }, ...(recommendations ? { recommendations } : {}),
  })
  const instanceId = (controller: ReturnType<typeof createChatController>): string => JSON.parse(controller.getState().messages.at(-1)?.content ?? '{}').instanceId as string
  const submitProfile = (application: ReturnType<typeof createOnboardingApplication>, controller: ReturnType<typeof createChatController>) => application.onComponentInteract({
    protocol: 'agentskit.chat.component', version: 1, type: 'interact', componentKey: 'form', instanceId: instanceId(controller), event: 'submit', value: { role: 'engineering', goal: 'Automate handoffs' },
  })

  it('guards collection, recommendation, selection, confirmation, and completion', async () => {
    const application = onboarding()
    const controller = createChatController(application.session.chat)
    await controller.send('/recommend')
    expect(application.session.getConversationSnapshot()!.state).toBe('welcome')
    await controller.send('/onboarding')
    expect(controller.getState().messages.at(-1)?.content).toContain('Tell us how you work')
    submitProfile(application, controller)
    await controller.send('/recommend')
    expect(controller.getState().messages.at(-1)?.content).toContain('engineering starter')
    application.onComponentSelect({ protocol: 'agentskit.chat.component', version: 1, type: 'select', componentKey: 'choice-list', instanceId: instanceId(controller), choiceId: 'accept' })
    await controller.send('/accept')
    expect(controller.getState().messages.at(-1)?.content).toContain('Complete onboarding')
    const confirmation = createActionConfirmation({ sessionId: application.session.sessionId, chat: controller, createId: () => 'complete', now: () => 0 })
    const pending = await confirmation.propose({ name: 'complete-onboarding', input: {} })
    await confirmation.approve(pending.token, application.session.sessionId)
    await controller.send('/revise')
    expect(application.session.getConversationSnapshot()!.state).toBe('collecting')
    submitProfile(application, controller)
    await controller.send('/recommend')
    application.onComponentSelect({ protocol: 'agentskit.chat.component', version: 1, type: 'select', componentKey: 'choice-list', instanceId: instanceId(controller), choiceId: 'accept' })
    await controller.send('/accept')
    await controller.send('/done')
    expect(application.session.getConversationSnapshot()!.state).toBe('confirming')
  })

  it('revises without allowing the recommendation to choose a transition', async () => {
    const application = onboarding()
    const controller = createChatController(application.session.chat)
    await controller.send('/onboarding')
    submitProfile(application, controller)
    await controller.send('/recommend')
    expect(application.session.getConversationSnapshot()!.state).toBe('review')
    application.onComponentSelect({ protocol: 'agentskit.chat.component', version: 1, type: 'select', componentKey: 'choice-list', instanceId: instanceId(controller), choiceId: 'revise' })
    await controller.send('/revise')
    expect(application.session.getConversationSnapshot()!.state).toBe('collecting')
    expect(controller.getState().messages.at(-1)?.content).toContain('Tell us how you work')
  })

  it('keeps recommendation failures in the collecting state', async () => {
    const application = onboarding({ recommend: () => { throw new Error('recommendation unavailable') } })
    const controller = createChatController(application.session.chat)
    await controller.send('/onboarding')
    submitProfile(application, controller)
    await controller.send('/recommend')
    expect(application.session.getConversationSnapshot()!.state).toBe('collecting')
    expect(controller.getState().status).toBe('error')
  })

  it('ignores stale component intents and isolates application factories', async () => {
    const first = onboarding()
    const second = onboarding()
    const firstController = createChatController(first.session.chat)
    const secondController = createChatController(second.session.chat)
    first.onComponentInteract({ protocol: 'agentskit.chat.component', version: 1, type: 'interact', componentKey: 'form', instanceId: 'forged', event: 'submit', value: { role: 'engineering', goal: 'Forged' } })
    await firstController.send('/onboarding')
    const staleForm = instanceId(firstController)
    submitProfile(first, firstController)
    await firstController.send('/recommend')
    const staleRecommendation = instanceId(firstController)
    first.onComponentInteract({ protocol: 'agentskit.chat.component', version: 1, type: 'interact', componentKey: 'form', instanceId: staleForm, event: 'submit', value: { role: 'support', goal: 'Stale' } })
    first.onComponentSelect({ protocol: 'agentskit.chat.component', version: 1, type: 'select', componentKey: 'choice-list', instanceId: 'foreign', choiceId: 'accept' })
    await firstController.send('/accept')
    expect(first.session.getConversationSnapshot()!.state).toBe('review')
    await secondController.send('/recommend')
    expect(second.session.getConversationSnapshot()!.state).toBe('welcome')
    expect(staleRecommendation).toContain('onboarding-recommendation-')
  })
})
