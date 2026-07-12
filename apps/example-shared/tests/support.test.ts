import { createActionConfirmation, createChatSession } from '@agentskit/chat'
import { createChatController } from '@agentskit/core'
import { describe, expect, it, vi } from 'vitest'
import { createInMemoryTicketService, createSupportApplication, helloWorldChat, type SupportHostContext, type TicketService } from '../src/index.js'

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
