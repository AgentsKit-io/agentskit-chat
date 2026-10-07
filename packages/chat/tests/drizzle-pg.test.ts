import { describe, expect, it, vi } from 'vitest'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createDrizzleSessionStorage } from '../src/drizzle-pg.js'
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
