import type { ChatDefinition, SessionStorage } from '@agentskit/chat'
import { createChatHandler } from '@agentskit/chat/server'

type ChatConfig = ChatDefinition['chat']
type AdapterFactory = ChatConfig['adapter']
type ChatMemory = NonNullable<ChatConfig['memory']>
type Message = NonNullable<ChatConfig['initialMessages']>[number]
type ToolDecisionStore = NonNullable<ChatConfig['decisionStore']>
type Stores = { readonly sessions: (tenant: string) => SessionStorage; readonly decisions: (tenant: string, sessionId: string) => ToolDecisionStore }

const check = (value: unknown, criterion: string): void => { if (!value) throw new Error(criterion) }
const pending = (toolCallId: string): Message[] => [
  { id: 'user', role: 'user', content: 'save it', status: 'complete', createdAt: new Date('2026-10-09T12:00:00.000Z') },
  { id: 'proposal', role: 'assistant', content: '', status: 'complete', createdAt: new Date('2026-10-09T12:00:01.000Z'),
    toolCalls: [{ id: toolCallId, name: 'save_expense', args: { amount: 42 }, status: 'requires_confirmation' }] },
]
const rejects = async (run: () => Promise<unknown>): Promise<boolean> => { try { await run(); return false } catch { return true } }

const adapter: AdapterFactory = {
  createSource: request => ({
    async *stream() {
      if (request.messages.some(message => message.role === 'tool')) yield { type: 'text', content: 'Saved.' }
      else yield { type: 'tool_call', toolCall: { id: 'call-1', name: 'save_expense', args: '{"amount":42}' } }
      yield { type: 'done' }
    },
    abort() {},
  }),
}

/** Exercise core 1.15's re-registration of earlier pending calls with an evolving transcript. */
export const runPendingProposalContract = async (stores: Stores, laterTurn: boolean): Promise<string> => {
  const sessionId = `pending-${crypto.randomUUID()}`
  let transcript: Message[] = []
  let modelCalls = 0
  const memory: ChatMemory = { load: async () => transcript, save: async messages => { transcript = structuredClone([...messages]) } }
  const store = stores.decisions('tenant-a', sessionId)
  const proposing: AdapterFactory = {
    createSource: () => ({
      async *stream() {
        modelCalls++
        const ids = laterTurn ? [`call-${modelCalls}`] : ['call-1', 'call-2']
        for (const id of ids) yield { type: 'tool_call', toolCall: { id, name: 'save_expense', args: '{"amount":42}' } }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
  const post = async (): Promise<void> => {
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'pending-contract', chat: { adapter: proposing, memory,
        tools: [{ name: 'save_expense', requiresConfirmation: true, execute: () => { throw new Error('Unapproved tool executed') } }] } }),
      sessionStorage: () => stores.sessions('tenant-a'), decisions: () => store,
    })
    const response = await handler(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: crypto.randomUUID(), sessionId,
        turnId: crypto.randomUUID(), sequence: 0, emittedAt: new Date().toISOString(), event: 'client.turn.submit', payload: { input: 'save it' } }),
    }))
    check(response.status === 200, 'pending proposal request succeeds')
    const events = (await response.text()).trim().split(/\r?\n/).map(line => JSON.parse(line) as { payload?: { status?: string; error?: unknown } })
    check(events.every(event => event.payload?.status !== 'error' && !event.payload?.error), 'pending proposal stream has no errors')
  }
  try {
    await post()
    const first = await store.get('call-1')
    check(first?.status === 'pending', 'first proposal remains pending')
    if (laterTurn) await post()
    const second = await store.get('call-2')
    check(second?.status === 'pending', 'second proposal is persisted')
    check(JSON.stringify((await store.get('call-1'))?.messages) === JSON.stringify(first?.messages), 'pending duplicate never overwrites the first snapshot')
    check((second?.messages.flatMap(message => message.toolCalls ?? []) ?? []).some(call => call.id === 'call-1'), 'second snapshot includes earlier pending call')
    check(first!.messages.length === 2 && first!.messages.flatMap(message => message.toolCalls ?? []).length === 1, 'first snapshot stays at the original proposal')
    return laterTurn ? 'new proposal in a later turn while an earlier call is pending' : 'two confirmation calls in the same model turn'
  } finally { await stores.sessions('tenant-a').delete?.(sessionId) }
}

/** Same acceptance flow on a Node pool and a Worker request client; no database mocks. */
export const runDecisionStoreContract = async (stores: Stores, rounds = 100): Promise<string[]> => {
  const run = crypto.randomUUID()
  const passed: string[] = []

  const session = `decision-${run}`
  const a = stores.decisions('tenant-a', session)
  await a.putPending({ toolCallId: 'call', status: 'pending', messages: pending('call') })
  await a.putPending({ toolCallId: 'call', status: 'pending', messages: pending('call') })
  const stored = await a.get('call')
  check(stored?.status === 'pending' && stored.messages.length === 2, 'putPending never overwrites the first snapshot')
  check(stored?.messages[0]?.createdAt instanceof Date && stored.messages[0].createdAt.toISOString() === '2026-10-09T12:00:00.000Z', 'message dates round-trip')
  check(await stores.decisions('tenant-b', session).get('call') === undefined, 'RF-13 another tenant cannot read the decision')
  check(await stores.decisions('tenant-a', `${session}-other`).get('call') === undefined, 'another session cannot read the decision')
  check(await stores.decisions('tenant-b', session).claim('call', 'approve') === undefined, 'RF-13 another tenant cannot claim the decision')
  check((await a.get('call'))?.status === 'pending', 'a foreign claim leaves the decision pending')
  check(await rejects(() => a.settle({ toolCallId: 'call', status: 'complete', decision: 'approve', messages: [] })), 'settle without a claim is rejected')
  await a.claim('call', 'approve')
  await a.settle({ toolCallId: 'call', status: 'complete', decision: 'approve', messages: pending('call') })
  check(await rejects(() => a.putPending({ toolCallId: 'call', status: 'pending', messages: pending('call') })), 'reused terminal tool-call ID is rejected')
  passed.push('tenant and session isolation; insert-if-absent pending snapshot')

  for (let round = 0; round < rounds; round++) {
    const id = `race-${round}`
    await a.putPending({ toolCallId: id, status: 'pending', messages: pending(id) })
    const claims = await Promise.all([
      ...Array.from({ length: 4 }, () => a.claim(id, 'approve')),
      ...Array.from({ length: 4 }, () => a.claim(id, 'deny', 'changed my mind')),
    ])
    const winners = claims.filter(claim => claim !== undefined)
    check(winners.length === 1, `RF-19/RF-21 claim race ${round}: ${winners.length} winners`)
    const winner = winners[0]!
    check(winner.status === 'claimed' && winner.messages.length === 2, 'the winner receives the stored snapshot')
    const other = winner.decision === 'approve' ? 'deny' : 'approve'
    check(await rejects(() => a.settle({ ...winner, status: 'complete', decision: other })), 'settle with another decision is rejected')
    await a.settle({ ...winner, status: winner.decision === 'approve' ? 'complete' : 'denied', outcome: { id, name: 'save_expense', args: { amount: 42 }, status: 'complete', result: 'saved' } })
    const settled = await a.get(id)
    check(settled !== undefined && settled.status !== 'claimed' && settled.decision === winner.decision && settled.outcome?.result === 'saved', 'the terminal outcome is persisted')
    check(await a.claim(id, winner.decision!) === undefined, 'a settled decision cannot be claimed again')
    check(await rejects(() => a.settle({ ...winner, status: 'failed' })), 'a settled decision cannot be settled again')
  }
  passed.push(`RF-19/RF-21 atomic claim: ${rounds} races of 8 claims, one winner each`)

  let writes = 0
  let modelCalls = 0
  for (let round = 0; round < rounds; round++) {
    const sessionId = `handler-${run}-${round}`
    let transcript: Message[] = []
    const memory: ChatMemory = { load: async () => transcript, save: async messages => { transcript = [...messages] } }
    const rows: unknown[] = []
    const counting: AdapterFactory = { createSource: request => { modelCalls++; return adapter.createSource(request) } }
    // A new handler per request: only the database and the message memory survive, like a restarted server.
    const handler = () => createChatHandler({
      resolveDefinition: () => ({ id: 'contract', chat: { adapter: counting, memory, tools: [{ name: 'save_expense', requiresConfirmation: true, execute: args => { rows.push(args); writes++; return 'expense saved' } }] } }),
      sessionStorage: () => stores.sessions('tenant-a'),
      decisions: (_context, id) => stores.decisions('tenant-a', id),
    })
    const post = (event: string, payload: unknown): Promise<Response> => handler()(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: crypto.randomUUID(), sessionId, turnId: crypto.randomUUID(), sequence: 0, emittedAt: new Date().toISOString(), event, payload }),
    }))
    const proposal = await post('client.turn.submit', { input: 'I spent 42 on lunch' })
    check(proposal.status === 200 && (await proposal.text()).includes('requires_confirmation'), 'RF-18 proposal is pending after the first request')
    const approve = async (): Promise<string> => {
      for (let attempt = 0; attempt < 200; attempt++) {
        const response = await post('client.action.decide', { token: 'call-1', decision: 'approve' })
        const body = await response.text()
        if (response.status === 200) return body.includes('expense saved') && body.includes('Saved.') ? 'ok' : 'incomplete'
        const code = (JSON.parse(body) as { error: { code: string } }).error.code
        if (code !== 'SESSION_BUSY' && code !== 'SESSION_CONFLICT') return code
      }
      return 'unsettled'
    }
    const outcomes = await Promise.all(Array.from({ length: 4 }, approve))
    check(rows.length === 1, `RF-19 round ${round}: ${rows.length} domain writes`)
    check(outcomes.includes('ok') && outcomes.every(outcome => outcome === 'ok' || outcome === 'ACTION_ALREADY_DECIDED'), `RF-19/RF-20 round ${round}: ${outcomes.join()}`)
    await stores.sessions('tenant-a').delete?.(sessionId)
  }
  check(writes === rounds && modelCalls === rounds * 2, `RF-19 ${writes} writes and ${modelCalls} model calls over ${rounds} rounds`)
  passed.push(`RF-18/RF-19/RF-20 handler: ${rounds} rounds of 4 concurrent approvals across fresh handlers, one execution and one model resume each`)
  passed.push(await runPendingProposalContract(stores, false), await runPendingProposalContract(stores, true))
  return passed
}
