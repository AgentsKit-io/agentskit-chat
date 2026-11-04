import { createInMemoryMemory } from '@agentskit/core'
import type { AdapterFactory, ChatMemory, ToolDecisionRecord, ToolDecisionStore } from '@agentskit/core'
import type { SessionStorage } from '@agentskit/chat'
import { decodeTurnEvent } from '@agentskit/chat/protocol'
import type { SessionSnapshot } from '@agentskit/chat/protocol'
import { createInMemoryCostStore } from '@agentskit/observability'
import type { CostStore, InMemoryCostStore } from '@agentskit/observability'
import { describe, expect, it } from 'vitest'

import { createChatHandler, eraseTenantChatData, TenantErasureError } from '../src/index.js'
import type { TenantDataEraser } from '../src/index.js'

const copy = <T>(value: T): T => structuredClone(value)
const key = (tenant: string, id: string): string => `${tenant}\u0000${id}`
/** Removes every entry whose key belongs to `tenant` and returns how many were removed. */
const eraseKeys = (map: Map<string, unknown>, tenant: string): number => {
  let removed = 0
  for (const id of [...map.keys()]) if (id.startsWith(`${tenant}\u0000`)) { map.delete(id); removed++ }
  return removed
}

/** Durable state of a multi-tenant host: every store keeps the tenant in its key, like a tenant_id column. */
const createWorld = () => {
  const sessions = new Map<string, SessionSnapshot>()
  const decisions = new Map<string, ToolDecisionRecord>()
  const memories = new Map<string, ChatMemory>()
  const costs = new Map<string, InMemoryCostStore>()
  const costOf = (tenant: string): InMemoryCostStore => costs.get(tenant) ?? costs.set(tenant, createInMemoryCostStore()).get(tenant)!
  const cost: CostStore = {
    reserve: input => costOf(input.tenant).reserve(input),
    commit: input => costOf(input.tenant).commit(input),
    release: input => costOf(input.tenant).release(input),
    window: input => costOf(input.tenant).window(input),
  }
  const storage = (tenant: string): SessionStorage => ({
    load: sessionId => copy(sessions.get(key(tenant, sessionId))),
    save: (snapshot, expected) => {
      if (sessions.get(key(tenant, snapshot.sessionId))?.cursor !== expected) return false
      sessions.set(key(tenant, snapshot.sessionId), copy(snapshot))
      return true
    },
  })
  const decisionStore = (tenant: string, sessionId: string): ToolDecisionStore => {
    const id = (toolCallId: string) => key(tenant, `${sessionId}\u0000${toolCallId}`)
    return {
      putPending: async record => { if (!decisions.has(id(record.toolCallId))) decisions.set(id(record.toolCallId), copy(record)) },
      get: async toolCallId => copy(decisions.get(id(toolCallId))),
      claim: async () => undefined,
      settle: async () => undefined,
    }
  }
  const memory = (tenant: string, sessionId: string): ChatMemory => memories.get(key(tenant, sessionId)) ?? memories.set(key(tenant, sessionId), createInMemoryMemory()).get(key(tenant, sessionId))!
  const adapter: AdapterFactory = {
    createSource: () => ({
      async *stream() {
        yield { type: 'tool_call', toolCall: { id: 'call-1', name: 'save_expense', args: '{"amount":42}' } }
        yield { type: 'usage', usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 } }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
  const handler = createChatHandler<{ readonly tenant: string }>({
    authenticate: request => ({ ok: true, context: { tenant: request.headers.get('x-tenant')! } }),
    resolveDefinition: (context, sessionId) => ({
      id: 'expenses',
      chat: { adapter, memory: memory(context!.tenant, sessionId), tools: [{ name: 'save_expense', requiresConfirmation: true, execute: async () => 'saved' }] },
    }),
    sessionStorage: context => storage(context!.tenant),
    decisions: (context, sessionId) => decisionStore(context!.tenant, sessionId),
    cost: context => ({ store: cost, tenant: context!.tenant, reserveUsd: 0.002, priceUsd: usage => usage.totalTokens / 1_000_000, model: 'synthetic-model' }),
  })
  let turn = 0
  const submit = async (tenant: string, sessionId: string): Promise<void> => {
    const response = await handler(new Request('http://localhost/chat', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant': tenant },
      body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: `event-${++turn}`, sessionId, turnId: `turn-${turn}`, sequence: 0,
        emittedAt: '2026-11-01T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'I spent 42 on lunch' } }),
    }))
    expect(response.status).toBe(200)
    for (const line of (await response.text()).trim().split(/\r?\n/)) expect(decodeTurnEvent(line).ok).toBe(true)
  }
  /** Host erasers: each deletes by tenant key only, the equivalent of `DELETE ... WHERE tenant_id = $1`. */
  const erasers: Record<'sessions' | 'decisions' | 'memory' | 'cost', TenantDataEraser> = {
    sessions: tenant => eraseKeys(sessions, tenant),
    decisions: tenant => eraseKeys(decisions, tenant),
    memory: tenant => eraseKeys(memories, tenant),
    cost: tenant => { const rows = costs.get(tenant)?.ledger().length ?? 0; costs.delete(tenant); return rows },
  }
  const owned = async (tenant: string) => ({
    sessions: [...sessions.keys()].filter(id => id.startsWith(`${tenant}\u0000`)).length,
    decisions: [...decisions.keys()].filter(id => id.startsWith(`${tenant}\u0000`)).length,
    messages: (await Promise.all(['s1', 's2'].map(async sessionId => memories.has(key(tenant, sessionId)) ? (await memory(tenant, sessionId).load()).length : 0))).reduce((a, b) => a + b, 0),
    ledger: costs.get(tenant)?.ledger().length ?? 0,
    spentUsd: (await cost.window({ tenant })).spentUsd,
  })
  return { submit, erasers, owned }
}

describe('eraseTenantChatData (RF-08)', () => {
  it('erases sessions, decisions, memory, and cost of one tenant in one call and leaves another tenant intact', async () => {
    const world = createWorld()
    for (const tenant of ['tenant-a', 'tenant-b']) for (const sessionId of ['s1', 's2']) await world.submit(tenant, sessionId)
    const before = await world.owned('tenant-a')
    expect(before).toMatchObject({ sessions: 2, decisions: 2, ledger: 2 })
    expect(before.messages).toBeGreaterThan(0)
    expect(before.spentUsd).toBeGreaterThan(0)
    const otherBefore = await world.owned('tenant-b')
    expect(otherBefore).toEqual(before)

    const receipt = await eraseTenantChatData({ tenant: 'tenant-a', ...world.erasers })

    expect(receipt).toEqual({ tenant: 'tenant-a', erased: { sessions: 2, decisions: 2, memory: 2, cost: 2 } })
    expect(await world.owned('tenant-a')).toEqual({ sessions: 0, decisions: 0, messages: 0, ledger: 0, spentUsd: 0 })
    expect(await world.owned('tenant-b')).toEqual(otherBefore)
    // A retry is safe and finds nothing left.
    expect((await eraseTenantChatData({ tenant: 'tenant-a', ...world.erasers })).erased).toEqual({ sessions: 0, decisions: 0, memory: 0, cost: 0 })
  })

  it('runs every category when one fails and reports the failed ones', async () => {
    const world = createWorld()
    await world.submit('tenant-a', 's1')
    const error = await eraseTenantChatData({ tenant: 'tenant-a', ...world.erasers, cost: () => { throw new Error('ledger offline') } }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(TenantErasureError)
    expect(error).toMatchObject({ tenant: 'tenant-a', failed: ['cost'], erased: { sessions: 1, decisions: 1, memory: 1 } })
    expect(await world.owned('tenant-a')).toMatchObject({ sessions: 0, decisions: 0, messages: 0, ledger: 1 })
  })

  it('refuses a blank tenant, a missing eraser, an invalid count, and an aborted signal before erasing', async () => {
    const world = createWorld()
    let calls = 0
    const counted: TenantDataEraser = () => { calls++; return 0 }
    const all = { sessions: counted, decisions: counted, memory: counted, cost: counted }
    await expect(eraseTenantChatData({ tenant: ' ', ...all })).rejects.toThrow(TypeError)
    await expect(eraseTenantChatData({ tenant: 'x'.repeat(257), ...all })).rejects.toThrow(TypeError)
    await expect(eraseTenantChatData({ tenant: 'tenant-a', ...all, timeoutMs: 0 })).rejects.toThrow(TypeError)
    await expect(eraseTenantChatData({ tenant: 'tenant-a', ...all, memory: undefined as unknown as TenantDataEraser })).rejects.toThrow('memory')
    await expect(eraseTenantChatData({ tenant: 'tenant-a', ...all, signal: AbortSignal.abort() })).rejects.toThrow()
    expect(calls).toBe(0)
    await expect(eraseTenantChatData({ tenant: 'tenant-a', ...world.erasers, sessions: () => -1 })).rejects.toMatchObject({ failed: ['sessions'] })
  })

  it('stops waiting for an eraser at the deadline', async () => {
    const world = createWorld()
    const error = await eraseTenantChatData({ tenant: 'tenant-a', ...world.erasers, timeoutMs: 10, decisions: () => new Promise<number>(() => undefined) }).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ failed: ['decisions'] })
  })
})
