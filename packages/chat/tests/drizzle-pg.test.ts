import { describe, expect, it, vi } from 'vitest'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { serializeMessages } from '@agentskit/core'
import type { Message, ToolCall, ToolDecisionRecord } from '@agentskit/core'
import { createDrizzleDecisionStore, createDrizzleSessionStorage } from '../src/drizzle-pg.js'
import { SessionSnapshotSchema } from '@agentskit/chat-protocol'

const snapshot = SessionSnapshotSchema.parse({ protocol: 'agentskit.chat.session', version: 1, sessionId: 'test',
  definitionId: 'definition', definitionRevision: 1, updatedAt: '2026-10-06T00:00:00.000Z', cursor: 1, confirmations: [] })

// Supporting branch/error checks only. SQL isolation and CAS require tests/storage-pg's real database contract.
const database = () => {
  let rows: unknown[] = []
  const query = {
    from: vi.fn(() => query), where: vi.fn(() => Promise.resolve(rows)),
    values: vi.fn(() => query), onConflictDoNothing: vi.fn(() => query),
    returning: vi.fn(() => Promise.resolve(rows)),
    set: vi.fn(() => query),
  }
  // Drizzle update.where is chainable; select/delete.where is awaited.
  const updateQuery = { set: vi.fn(() => updateQuery), where: vi.fn(() => updateQuery), returning: query.returning }
  const db = { select: vi.fn(() => query), insert: vi.fn(() => query), update: vi.fn(() => updateQuery), delete: vi.fn(() => query) }
  return { db: db as unknown as NodePgDatabase, query, rows: (value: unknown[]) => { rows = value } }
}

describe('Drizzle session boundary (supporting checks)', () => {
  it('rejects absent tenants, invalid cursors, corrupt snapshots and pre-aborted operations before SQL', async () => {
    const { db } = database()
    for (const tenant of ['', ' ', 'a'.repeat(257)]) expect(() => createDrizzleSessionStorage(db, tenant)).toThrow(TypeError)
    const storage = createDrizzleSessionStorage(db, 'tenant')
    for (const cursor of [-1, 1, 1.1, NaN]) await expect(storage.save(snapshot, cursor)).rejects.toThrow(TypeError)
    await expect(storage.save({ ...snapshot, cursor: -1 }, undefined)).rejects.toThrow()
    const controller = new AbortController(); controller.abort()
    await expect(storage.load('test', controller.signal)).rejects.toThrow()
    await expect(storage.save(snapshot, undefined, controller.signal)).rejects.toThrow()
    await expect(storage.delete?.('test', controller.signal)).rejects.toThrow()
  })
  it('validates stored envelopes and returns committed write outcomes', async () => {
    const fixture = database(), storage = createDrizzleSessionStorage(fixture.db, 'tenant')
    expect(await storage.load('test')).toBeUndefined()
    fixture.rows([{ snapshot }])
    expect(await storage.load('test')).toEqual(snapshot)
    fixture.rows([{ snapshot: { broken: true } }])
    await expect(storage.load('test')).rejects.toThrow()
    fixture.rows([{ cursor: 1 }])
    expect(await storage.save(snapshot, undefined)).toBe(true)
    expect(await storage.save(snapshot, 0)).toBe(true)
    fixture.rows([])
    expect(await storage.save(snapshot, undefined)).toBe(false)
    expect(await storage.save(snapshot, 0)).toBe(false)
    await storage.delete?.('test')
  })
})

describe('Drizzle decision boundary (supporting checks)', () => {
  const messages: Message[] = [{ id: 'm1', role: 'user', content: 'pay it', status: 'complete', createdAt: new Date('2026-10-06T00:00:00.000Z') }]
  const outcome: ToolCall = { id: 'call-1', name: 'pay', args: '{}', status: 'complete', result: 'paid' }
  const row = { toolCallId: 'call-1', status: 'pending', decision: null, reason: null, record: { messages: serializeMessages(messages) } }

  it('rejects absent or oversized tenant and session scopes before SQL', () => {
    const { db } = database()
    for (const [tenant, session] of [['', 'session'], [' ', 'session'], ['tenant', ''], ['tenant', ' '], ['a'.repeat(257), 'session'], ['tenant', 'a'.repeat(257)]]) {
      expect(() => createDrizzleDecisionStore(db, tenant!, session!)).toThrow(TypeError)
    }
  })
  it('records pending calls and decodes stored rows with their optional decision, reason and outcome', async () => {
    const fixture = database(), store = createDrizzleDecisionStore(fixture.db, 'tenant', 'session')
    await store.putPending({ toolCallId: 'call-1', status: 'pending', messages })
    expect(fixture.query.values).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant', sessionId: 'session', toolCallId: 'call-1', status: 'pending' }))
    expect(await store.get('call-1')).toBeUndefined()
    fixture.rows([row])
    expect(await store.get('call-1')).toEqual({ toolCallId: 'call-1', status: 'pending', messages })
    fixture.rows([{ ...row, status: 'complete', decision: 'approve', reason: 'ok', record: { ...row.record, outcome } }])
    expect(await store.get('call-1')).toEqual({ toolCallId: 'call-1', status: 'complete', messages, decision: 'approve', reason: 'ok', outcome })
  })
  it('returns the claimed record to the single winner and nothing to the loser', async () => {
    const fixture = database(), store = createDrizzleDecisionStore(fixture.db, 'tenant', 'session')
    fixture.rows([{ ...row, status: 'claimed', decision: 'deny', reason: 'no' }])
    expect(await store.claim('call-1', 'deny', 'no')).toEqual({ toolCallId: 'call-1', status: 'claimed', messages, decision: 'deny', reason: 'no' })
    fixture.rows([])
    expect(await store.claim('call-1', 'approve')).toBeUndefined()
  })
  it('settles only a terminal record that matches its claim', async () => {
    const fixture = database(), store = createDrizzleDecisionStore(fixture.db, 'tenant', 'session')
    const settled: ToolDecisionRecord = { toolCallId: 'call-1', status: 'complete', messages, decision: 'approve', outcome }
    for (const invalid of [{ ...settled, status: 'pending' as const }, { ...settled, status: 'claimed' as const }, { toolCallId: 'call-1', status: 'complete' as const, messages }]) {
      await expect(store.settle(invalid)).rejects.toThrow(TypeError)
    }
    fixture.rows([])
    await expect(store.settle(settled)).rejects.toThrow('matching claim')
    fixture.rows([{ toolCallId: 'call-1' }])
    await expect(store.settle(settled)).resolves.toBeUndefined()
    await expect(store.settle({ ...settled, status: 'failed', outcome: undefined })).resolves.toBeUndefined()
  })
})
