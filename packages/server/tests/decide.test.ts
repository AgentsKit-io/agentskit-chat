import { createInMemoryMemory } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, ChatMemory, ToolDecisionRecord, ToolDecisionStore } from '@agentskit/core'
import type { SessionStorage } from '@agentskit/chat'
import { ACTION_DECIDE_CAPABILITY, decodeTurnEvent } from '@agentskit/chat/protocol'
import type { SessionSnapshot, SnapshotTurnEvent } from '@agentskit/chat/protocol'
import { describe, expect, it } from 'vitest'

import { runPendingProposalContract } from '../../../tests/storage-pg/decision-contract.js'

import { createChatHandler } from '../src/index.js'

const copy = <T>(value: T): T => structuredClone(value)

/** Everything that survives a server restart: session snapshot, memory, decisions, and the domain table. */
const createWorld = (options: { readonly failTool?: boolean; readonly toolDelayMs?: number; readonly resumeDelayMs?: number } = {}) => {
  let session: SessionSnapshot | undefined
  const memory: ChatMemory = createInMemoryMemory()
  const decisions = new Map<string, ToolDecisionRecord>()
  const domainRows: unknown[] = []
  const modelRequests: AdapterRequest[] = []
  const storage: SessionStorage = {
    load: () => copy(session),
    save: (snapshot, expected) => {
      if (session?.cursor !== expected) return false
      session = copy(snapshot)
      return true
    },
  }
  const store: ToolDecisionStore = {
    putPending: async record => { if (!decisions.has(record.toolCallId)) decisions.set(record.toolCallId, copy(record)) },
    get: async id => copy(decisions.get(id)),
    claim: async (id, decision, reason) => {
      const record = decisions.get(id)
      if (record?.status !== 'pending') return undefined
      const claimed: ToolDecisionRecord = { ...record, status: 'claimed', decision, ...(reason === undefined ? {} : { reason }) }
      decisions.set(id, copy(claimed))
      return copy(claimed)
    },
    settle: async record => {
      const claimed = decisions.get(record.toolCallId)
      if (claimed?.status !== 'claimed' || claimed.decision !== record.decision) throw new Error('No matching claim')
      decisions.set(record.toolCallId, copy(record))
    },
  }
  const adapter: AdapterFactory = {
    createSource: request => ({
      async *stream() {
        modelRequests.push(request)
        if (!request.messages.some(message => message.role === 'tool')) {
          yield { type: 'tool_call', toolCall: { id: 'call-1', name: 'save_expense', args: '{"amount":42}' } }
        } else {
          if (options.resumeDelayMs) await new Promise(resolve => setTimeout(resolve, options.resumeDelayMs))
          yield { type: 'text', content: 'Saved.' }
        }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
  /** A new handler per call: nothing but the durable stores is shared, like a restarted server. */
  const handler = (withDecisions = true) => createChatHandler({
    resolveDefinition: () => ({
      id: 'expenses',
      chat: {
        adapter,
        memory,
        tools: [{
          name: 'save_expense',
          requiresConfirmation: true,
          execute: async args => {
            if (options.toolDelayMs) await new Promise(resolve => setTimeout(resolve, options.toolDelayMs))
            if (options.failTool) throw new Error('ledger offline')
            domainRows.push(args)
            return 'expense saved'
          },
        }],
      },
    }),
    sessionStorage: () => storage,
    ...(withDecisions ? { decisions: () => store } : {}),
  })
  return { handler, decisions, domainRows, modelRequests, memory, storage, store }
}

let sequence = 0
const event = (name: string, payload: unknown, turnId = `turn-${++sequence}`) => ({
  protocol: 'agentskit.chat.turn', version: 1, eventId: `event-${turnId}`, sessionId: 'session', turnId, sequence: 0,
  emittedAt: '2026-10-09T00:00:00.000Z', event: name, payload,
})
const post = (handler: ReturnType<typeof createChatHandler>, body: unknown): Promise<Response> => handler(new Request('http://localhost/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}))
const lines = async (response: Response) => (await response.text()).trim().split(/\r?\n/).map(line => {
  const decoded = decodeTurnEvent(line)
  if (!decoded.ok) throw new Error(`invalid stream line: ${line}`)
  return decoded.event
})
const lastSnapshot = async (response: Response): Promise<SnapshotTurnEvent> => {
  const snapshot = (await lines(response)).filter(line => line.event === 'server.turn.snapshot').at(-1)
  if (!snapshot || snapshot.event !== 'server.turn.snapshot') throw new Error('stream has no snapshot')
  return snapshot
}
const toolCall = (snapshot: SnapshotTurnEvent) => snapshot.payload.messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === 'call-1')
const propose = async (world: ReturnType<typeof createWorld>) => {
  const response = await post(world.handler(), event('client.turn.submit', { input: 'I spent 42 on lunch' }))
  expect(response.status).toBe(200)
  return lastSnapshot(response)
}
const decide = (world: ReturnType<typeof createWorld>, decision: 'approve' | 'deny', extra: Record<string, unknown> = {}, turnId?: string) =>
  post(world.handler(), event('client.action.decide', { token: 'call-1', decision, ...extra }, turnId))
const error = async (response: Response) => ((await response.json()) as { error: { code: string } }).error.code
/** Decides like a real client: a retryable 409 (lease or cursor lost to a concurrent request) is retried until a terminal answer. */
const decideUntilSettled = async (world: ReturnType<typeof createWorld>, decision: 'approve' | 'deny'): Promise<string> => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const response = await decide(world, decision)
    if (response.status === 200) { await response.text(); return 'ok' }
    const code = await error(response)
    if (code !== 'SESSION_BUSY' && code !== 'SESSION_CONFLICT') return code
    await new Promise(resolve => setTimeout(resolve, 1))
  }
  throw new Error('decision never settled')
}

describe('client.action.decide (RF-17..RF-24)', () => {
  for (const laterTurn of [false, true]) it(`keeps pending proposals with evolving messages (${laterTurn ? 'later turn' : 'same turn'})`, async () => {
    const world = createWorld()
    await runPendingProposalContract({ sessions: () => world.storage, decisions: () => world.store }, laterTurn)
    expect(world.decisions.size).toBe(2)
  })

  it('RF-17: validates the decision payload and announces the capability', async () => {
    const world = createWorld()
    const first = await post(world.handler(), event('client.turn.submit', { input: 'I spent 42 on lunch' }))
    const [opening] = await lines(first)
    expect(opening).toMatchObject({ event: 'server.turn.snapshot', payload: { capabilities: [ACTION_DECIDE_CAPABILITY] } })
    for (const payload of [{ token: 'call-1', decision: 'maybe' }, { token: '', decision: 'approve' }, { decision: 'approve' }, { token: 'call-1', decision: 'approve', extra: true }]) {
      const response = await post(world.handler(), event('client.action.decide', payload))
      expect(response.status).toBe(400)
      expect(await error(response)).toBe('REQUEST_INVALID_EVENT')
    }
    expect(world.domainRows).toHaveLength(0)
  })

  it('RF-17/RF-23: an unknown token is a typed 404, never a silent no-op', async () => {
    const world = createWorld()
    const response = await decide(world, 'approve')
    expect(response.status).toBe(404)
    expect(await error(response)).toBe('ACTION_NOT_FOUND')
    expect(world.modelRequests).toHaveLength(0)
  })

  it('returns a typed 501 when the host did not configure a decision store', async () => {
    const world = createWorld()
    const response = await post(world.handler(false), event('client.action.decide', { token: 'call-1', decision: 'approve' }))
    expect(response.status).toBe(501)
    expect(await error(response)).toBe('ACTION_DECIDE_UNAVAILABLE')
  })

  it('RF-18: proposal in one request, restart, approve in another: tool runs once and the model resumes in the same stream', async () => {
    const world = createWorld()
    const proposal = await propose(world)
    expect(toolCall(proposal)).toMatchObject({ name: 'save_expense', status: 'requires_confirmation' })
    expect(world.decisions.get('call-1')).toMatchObject({ status: 'pending' })
    expect(world.domainRows).toHaveLength(0)

    const response = await decide(world, 'approve')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/x-ndjson')
    const snapshot = await lastSnapshot(response)
    expect(toolCall(snapshot)).toMatchObject({ status: 'complete', result: 'expense saved' })
    expect(snapshot.payload.messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Saved.' })
    expect(snapshot.payload.status).toBe('complete')
    expect(snapshot.sequence).toBeGreaterThan(proposal.sequence)
    expect(world.domainRows).toEqual([{ amount: 42 }])
    expect(world.modelRequests).toHaveLength(2)
    expect(world.modelRequests[1]?.messages.some(message => message.role === 'tool' && message.content.includes('expense saved'))).toBe(true)
    expect(world.decisions.get('call-1')).toMatchObject({ status: 'complete', decision: 'approve' })
    expect((await world.memory.load()).at(-1)).toMatchObject({ content: 'Saved.' })
  })

  it('RF-19: 100 rounds of concurrent approvals execute the tool exactly once per token', async () => {
    for (let round = 0; round < 100; round++) {
      const world = createWorld()
      await propose(world)
      const codes = await Promise.all(Array.from({ length: 8 }, () => decideUntilSettled(world, 'approve')))
      expect(world.domainRows, `round ${round}`).toHaveLength(1)
      // The winner executes; every other approval ends as a replay of the recorded result or as already decided.
      expect(codes.every(code => code === 'ok' || code === 'ACTION_ALREADY_DECIDED'), codes.join()).toBe(true)
      expect(codes).toContain('ok')
      expect(world.modelRequests, `round ${round}`).toHaveLength(2)
    }
  })

  it('RF-19: a slow tool keeps later approvals out until the first one settles', async () => {
    const world = createWorld({ toolDelayMs: 20 })
    await propose(world)
    const first = decide(world, 'approve')
    await new Promise(resolve => setTimeout(resolve, 5))
    const late = await decide(world, 'approve')
    expect(late.status).toBe(409)
    expect(await error(late)).toBe('ACTION_ALREADY_DECIDED')
    expect((await first).status).toBe(200)
    await (await first).text()
    expect(world.domainRows).toHaveLength(1)
  })

  it('does not replay a settled decision while its model resume is still active', async () => {
    const world = createWorld({ resumeDelayMs: 30 })
    await propose(world)
    const first = await decide(world, 'approve')
    const drain = lastSnapshot(first)
    while (world.decisions.get('call-1')?.status !== 'complete') await new Promise(resolve => setTimeout(resolve, 1))
    const late = await decide(world, 'approve')
    expect(late.status).toBe(409)
    expect(await error(late)).toBe('ACTION_ALREADY_DECIDED')
    expect((await drain).payload.messages.at(-1)?.content).toBe('Saved.')
    const replay = await lastSnapshot(await decide(world, 'approve'))
    expect(replay.payload.messages.at(-1)?.content).toBe('Saved.')
    expect(world.domainRows).toHaveLength(1)
    expect(world.modelRequests).toHaveLength(2)
  })

  it('RF-20: resending the same approval replays the recorded result without calling the tool or the model', async () => {
    const world = createWorld()
    await propose(world)
    const first = await lastSnapshot(await decide(world, 'approve', {}, 'decide-turn'))
    for (const turnId of ['decide-turn', 'another-turn']) {
      const replay = await decide(world, 'approve', {}, turnId)
      expect(replay.status).toBe(200)
      const snapshot = await lastSnapshot(replay)
      expect(toolCall(snapshot)).toMatchObject({ status: 'complete', result: 'expense saved' })
      expect(snapshot.payload.messages.at(-1)).toMatchObject({ content: 'Saved.' })
      expect(snapshot.sequence).toBeGreaterThan(first.sequence)
    }
    expect(world.domainRows).toHaveLength(1)
    expect(world.modelRequests).toHaveLength(2)
  })

  it('RF-21: concurrent approve and deny persist exactly one decision', async () => {
    for (let round = 0; round < 50; round++) {
      const world = createWorld()
      await propose(world)
      const codes = await Promise.all([decideUntilSettled(world, 'approve'), decideUntilSettled(world, 'deny')])
      expect([...codes].sort(), codes.join()).toEqual(['ACTION_ALREADY_DECIDED', 'ok'])
      const record = world.decisions.get('call-1')
      expect(world.domainRows).toHaveLength(record?.decision === 'approve' ? 1 : 0)
      expect(record?.status).toBe(record?.decision === 'approve' ? 'complete' : 'denied')
    }
  })

  it('RF-21: a decision that conflicts with a settled one is rejected', async () => {
    const world = createWorld()
    await propose(world)
    const denied = await lastSnapshot(await decide(world, 'deny', { reason: 'wrong amount' }))
    expect(toolCall(denied)).toMatchObject({ status: 'error', error: 'Permission denied: wrong amount' })
    expect(denied.payload.messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Saved.' })
    const approve = await decide(world, 'approve')
    expect(approve.status).toBe(409)
    expect(await error(approve)).toBe('ACTION_ALREADY_DECIDED')
    expect(world.domainRows).toHaveLength(0)
  })

  it('RF-22: a tool failure after the claim is recorded, reaches the model, and is never re-executed', async () => {
    const world = createWorld({ failTool: true })
    await propose(world)
    const snapshot = await lastSnapshot(await decide(world, 'approve'))
    expect(toolCall(snapshot)).toMatchObject({ status: 'error', error: expect.stringContaining('ledger offline') })
    expect(world.decisions.get('call-1')).toMatchObject({ status: 'failed' })
    expect(world.modelRequests).toHaveLength(2)
    expect(world.modelRequests[1]?.messages.some(message => message.role === 'tool' && message.content.includes('ledger offline'))).toBe(true)
    const retry = await decide(world, 'approve')
    expect(retry.status).toBe(200)
    expect(toolCall(await lastSnapshot(retry))).toMatchObject({ status: 'error' })
    expect(world.modelRequests).toHaveLength(2)
    expect(world.domainRows).toHaveLength(0)
  })

  it('RF-24: the decision port is host-supplied, so an external claim decides who executes', async () => {
    const world = createWorld()
    await propose(world)
    const claims: string[] = []
    const external: ToolDecisionStore = {
      putPending: async () => undefined,
      get: async id => world.decisions.get(id),
      // The host's own compare-and-swap (for example a proposals table) rejects this claim.
      claim: async (id, decision) => { claims.push(`${id}:${decision}`); return undefined },
      settle: async () => { throw new Error('unreachable') },
    }
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'expenses', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }, memory: world.memory, tools: [{ name: 'save_expense', requiresConfirmation: true, execute: () => { world.domainRows.push('external'); return 'saved' } }] } }),
      sessionStorage: () => ({ load: () => undefined, save: () => true }),
      decisions: () => external,
    })
    const response = await post(handler, event('client.action.decide', { token: 'call-1', decision: 'approve' }))
    expect(response.status).toBe(409)
    expect(await error(response)).toBe('ACTION_ALREADY_DECIDED')
    expect(claims).toEqual(['call-1:approve'])
    expect(world.domainRows).toHaveLength(0)
  })
})
