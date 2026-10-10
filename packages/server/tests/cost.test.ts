import type { AdapterFactory } from '@agentskit/core'
import type { SessionStorage } from '@agentskit/chat'
import { decodeTurnEvent } from '@agentskit/chat/protocol'
import type { SessionSnapshot } from '@agentskit/chat/protocol'
import { createInMemoryCostStore } from '@agentskit/observability'
import { describe, expect, it } from 'vitest'

import { createChatHandler } from '../src/index.js'
import type { TurnCostPolicy } from '../src/index.js'

const createStorage = (): SessionStorage => {
  const sessions = new Map<string, SessionSnapshot>()
  return {
    load: sessionId => structuredClone(sessions.get(sessionId)),
    save: (snapshot, expected) => {
      if (sessions.get(snapshot.sessionId)?.cursor !== expected) return false
      sessions.set(snapshot.sessionId, structuredClone(snapshot))
      return true
    },
  }
}

/** 1000 prompt + 500 completion tokens per call; priced at 1 USD per 1M tokens, a turn costs 0.0015 USD. */
const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
const priceUsd: TurnCostPolicy['priceUsd'] = tokens => tokens.totalTokens / 1_000_000
const createWorld = (policy: Partial<TurnCostPolicy> = {}, failing: (call: number) => boolean = () => false) => {
  const store = createInMemoryCostStore()
  const storage = createStorage()
  let calls = 0
  const adapter: AdapterFactory = {
    createSource: () => ({
      async *stream() {
        const call = calls++
        if (failing(call)) { yield { type: 'error', content: 'provider unavailable' }; return }
        yield { type: 'text', content: 'ok' }
        yield { type: 'usage', usage }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
  const handler = createChatHandler({
    resolveDefinition: () => ({ id: 'metered', chat: { adapter } }),
    sessionStorage: () => storage,
    cost: () => ({ store, tenant: 'household-1', capUsd: 0.01, reserveUsd: 0.002, priceUsd, model: 'gemini-2.5-flash-lite', source: 'chat', ...policy }),
  })
  let turn = 0
  const submit = (sessionId = 'session', turnId?: string): Promise<Response> => handler(new Request('http://localhost/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: `event-${++turn}`, sessionId, turnId: turnId ?? `turn-${turn}`, sequence: 0,
      emittedAt: '2026-10-09T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }),
  }))
  return { store, submit, modelCalls: () => calls }
}
const events = async (response: Response) => (await response.text()).trim().split(/\r?\n/).map(line => {
  const decoded = decodeTurnEvent(line)
  if (!decoded.ok) throw new Error(`invalid stream line: ${line}`)
  return decoded.event
})

describe('turn cost policy (RF-25..RF-29)', () => {
  it('RF-29: commits the real usage of a finished turn to the ledger and holds nothing afterwards', async () => {
    const world = createWorld({ fallback: true })
    const response = await world.submit()
    expect(response.status).toBe(200)
    const [first] = await events(response)
    expect(first).toMatchObject({ event: 'server.turn.snapshot', payload: { quota: { utilization: 0.2, warning: false } } })
    expect(await world.store.window({ tenant: 'household-1', capUsd: 0.01 })).toMatchObject({ spentUsd: 0.0015, reservedUsd: 0, utilization: 0.15 })
    expect(world.store.ledger()).toEqual([{
      tenant: 'household-1', reservationId: expect.stringMatching(/^session:turn-1:/), model: 'gemini-2.5-flash-lite',
      promptTokens: 1000, completionTokens: 500, costUsd: 0.0015, source: 'chat', fallback: true,
    }])
  })

  it('does not reuse a committed reservation after the 64-turn replay window', async () => {
    const world = createWorld({ capUsd: 65 * 0.0015 + 0.00001, reserveUsd: 0.0015 })
    for (let turn = 0; turn < 65; turn++) {
      const response = await world.submit('session', `cycle-${turn}`)
      expect(response.status).toBe(200)
      await response.text()
    }
    expect((await world.submit('session', 'cycle-0')).status).toBe(402)
    expect(world.modelCalls()).toBe(65)
  })

  it('RF-27: warns from 80% of the cap and answers 402 QUOTA_EXCEEDED once the cap cannot fit another turn', async () => {
    const world = createWorld({ reserveUsd: 0.0015 })
    const warnings: boolean[] = []
    for (let turn = 0; turn < 6; turn++) {
      const response = await world.submit()
      expect(response.status).toBe(200)
      const [first] = await events(response)
      warnings.push(first?.event === 'server.turn.snapshot' && first.payload.quota?.warning === true)
    }
    // 6 turns of 0.0015 = 0.009 spent; reserving the 6th brought utilization to 90%.
    expect(warnings).toEqual([false, false, false, false, false, true])
    const blocked = await world.submit()
    expect(blocked.status).toBe(402)
    expect(await blocked.json()).toEqual({ error: { version: 1, code: 'QUOTA_EXCEEDED', message: 'The usage limit for this plan has been reached.', retryable: false } })
    expect(world.modelCalls()).toBe(6)
    expect(await world.store.window({ tenant: 'household-1' })).toMatchObject({ spentUsd: 0.009, reservedUsd: 0 })
    // The refused turn released its session lease: the next request is refused for quota again, not for a busy session.
    expect((await world.submit()).status).toBe(402)
  })

  it('RF-26: concurrent turns across sessions never reserve past the cap', async () => {
    const world = createWorld({ capUsd: 0.01, reserveUsd: 0.002 })
    const responses = await Promise.all(Array.from({ length: 50 }, (_, index) => world.submit(`session-${index}`)))
    const statuses = responses.map(response => response.status)
    expect(statuses.filter(status => status === 200)).toHaveLength(5)
    expect(statuses.filter(status => status === 402)).toHaveLength(45)
    await Promise.all(responses.map(response => response.text()))
    expect(world.modelCalls()).toBe(5)
    expect(await world.store.window({ tenant: 'household-1' })).toMatchObject({ spentUsd: 0.0075, reservedUsd: 0 })
  })

  it('RF-28: 100 turns with 20% provider failures leave no reservation held and spend equal to the ledger', async () => {
    const world = createWorld({ capUsd: 1 }, call => call % 5 === 0)
    for (let turn = 0; turn < 100; turn++) await (await world.submit()).text()
    const window = await world.store.window({ tenant: 'household-1' })
    const ledger = world.store.ledger()
    expect(ledger).toHaveLength(100)
    expect(window.reservedUsd).toBe(0)
    expect(window.spentUsd).toBeCloseTo(ledger.reduce((total, row) => total + row.costUsd, 0), 9)
    expect(window.spentUsd).toBeCloseTo(80 * 0.0015 + 20 * 0.002, 9)
  })

  it.each(['cancel', 'timeout'] as const)('RF-28: a dispatched request commits unknown usage on %s', async mode => {
    const store = createInMemoryCostStore()
    const abort = new AbortController()
    const adapter: AdapterFactory = { createSource: () => ({ async *stream() { await new Promise(resolve => setTimeout(resolve, 200)); yield { type: 'done' } }, abort() {} }) }
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'metered', chat: { adapter } }),
      timeoutMs: mode === 'timeout' ? 50 : 1000,
      sessionStorage: () => createStorage(),
      cost: () => ({ store, tenant: 't', capUsd: 1, reserveUsd: 0.5, priceUsd, model: 'm' }),
    })
    const response = await handler(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: abort.signal,
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: 'event', sessionId: 'session', turnId: 'turn', sequence: 0,
        emittedAt: '2026-10-09T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }),
    }))
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0.5 })
    if (mode === 'cancel') abort.abort()
    await response.text().catch(() => undefined)
    // Cleanup waits for the adapter to settle before it settles; poll instead of guessing its delay.
    await expect.poll(async () => (await store.window({ tenant: 't' })).reservedUsd, { timeout: 2000 }).toBe(0)
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0, spentUsd: 0.5 })
  })

  it('releases a reservation when memory fails before dispatch', async () => {
    const store = createInMemoryCostStore()
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'metered', chat: {
        adapter: { createSource: () => { throw new Error('must not dispatch') } },
        memory: { load: async () => { throw new Error('unavailable') }, save: async () => undefined },
      } }),
      sessionStorage: () => createStorage(),
      cost: () => ({ store, tenant: 't', capUsd: 1, reserveUsd: 0.5, priceUsd, model: 'm' }),
    })
    const response = await handler(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: 'event', sessionId: 'session', turnId: 'turn', sequence: 0,
        emittedAt: '2026-10-09T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }),
    }))
    expect(response.status).toBe(500)
    expect(await store.window({ tenant: 't' })).toMatchObject({ reservedUsd: 0, spentUsd: 0 })
  })

  it('leaves turns unmetered when the host resolves no policy', async () => {
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'free', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) } } }),
      sessionStorage: () => createStorage(),
      cost: () => undefined,
    })
    const response = await handler(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: 'event', sessionId: 'session', turnId: 'turn', sequence: 0,
        emittedAt: '2026-10-09T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }),
    }))
    expect(response.status).toBe(200)
    const [first] = await events(response)
    expect(first?.event === 'server.turn.snapshot' && first.payload.quota).toBeUndefined()
  })
})
