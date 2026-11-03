import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { expect, it } from 'vitest'
import { SessionSnapshotSchema } from '@agentskit/chat/protocol'
import * as current from '@agentskit/chat/drizzle-pg'
import * as previous from '@agentskit/chat-previous/drizzle-pg'

const connection = { host: '127.0.0.1', port: 56439, user: 'chat_test' }

/** A disposable database per scenario, so the migration journal and tables start empty and other tests stay untouched. */
const withDatabase = async (run: (db: NodePgDatabase, pool: Pool) => Promise<void>): Promise<void> => {
  const name = `chat_migration_${crypto.randomUUID().replaceAll('-', '')}`
  const admin = new Pool({ ...connection, database: 'chat_test' })
  await admin.query(`CREATE DATABASE ${name}`)
  const pool = new Pool({ ...connection, database: name })
  try { await run(drizzle(pool), pool) } finally {
    await pool.end()
    await admin.query(`DROP DATABASE ${name}`)
    await admin.end()
  }
}

/**
 * The previous published release's own schema step: its shipped migrations when it has them,
 * otherwise (0.7.0, before migrations shipped) the DDL it exported for applications to run.
 */
const applyPrevious = async (db: NodePgDatabase, pool: Pool): Promise<void> => {
  const shipped: Record<string, unknown> = previous
  const migrate = shipped['migrateChatSchema']
  if (typeof migrate === 'function') return (migrate as (db: NodePgDatabase) => Promise<void>)(db)
  await pool.query(previous.chatSessionDDL)
  await pool.query(previous.chatDecisionDDL)
}

const schemaShape = async (pool: Pool): Promise<unknown> => {
  const columns = await pool.query(`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name LIKE 'agentskit_chat_%' ORDER BY table_name, column_name`)
  const constraints = await pool.query(`SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid::regclass::text LIKE 'agentskit_chat_%' ORDER BY table_name, conname`)
  return { columns: columns.rows, constraints: constraints.rows }
}

const rows = async (pool: Pool): Promise<unknown> => ({
  sessions: (await pool.query('SELECT * FROM agentskit_chat_sessions ORDER BY tenant_id, session_id')).rows,
  decisions: (await pool.query('SELECT * FROM agentskit_chat_decisions ORDER BY tenant_id, session_id, tool_call_id')).rows,
})

const snapshot = (sessionId: string, cursor: number) => SessionSnapshotSchema.parse({
  protocol: 'agentskit.chat.session', version: 1, sessionId, definitionId: 'migration', definitionRevision: 1,
  updatedAt: '2026-11-03T00:00:00.000Z', cursor, confirmations: [],
})
type Message = Parameters<ReturnType<typeof previous.createDrizzleDecisionStore>['putPending']>[0]['messages'][number]
const messages: Message[] = [{ id: 'm1', role: 'user', content: 'Book a table for two', status: 'complete', createdAt: new Date('2026-11-03T00:00:00.000Z') }]
const call = (id: string) => ({ id, name: 'book_table', args: { seats: 2 }, status: 'complete' as const, result: 'booked' })

it('RF-07: previous published schema, then the current drizzle-kit migrations, without manual SQL or data loss', async () => {
  let upgraded: unknown
  await withDatabase(async (db, pool) => {
    await applyPrevious(db, pool)
    const oldSessions = previous.createDrizzleSessionStorage(db, 'tenant-a')
    expect(await oldSessions.save(snapshot('s1', 0), undefined)).toBe(true)
    expect(await oldSessions.save(snapshot('s1', 3), 0)).toBe(true)
    const oldDecisions = previous.createDrizzleDecisionStore(db, 'tenant-a', 's1')
    await oldDecisions.putPending({ toolCallId: 'settled', status: 'pending', messages })
    await oldDecisions.claim('settled', 'approve', 'customer asked')
    await oldDecisions.settle({ toolCallId: 'settled', status: 'complete', decision: 'approve', messages, outcome: call('settled') })
    await oldDecisions.putPending({ toolCallId: 'waiting', status: 'pending', messages })
    const before = await rows(pool)

    await current.migrateChatSchema(db)
    await current.migrateChatSchema(db)

    expect(await rows(pool)).toEqual(before)
    const sessions = current.createDrizzleSessionStorage(db, 'tenant-a')
    expect(await sessions.load('s1')).toEqual(snapshot('s1', 3))
    expect(await sessions.save(snapshot('s1', 4), 3)).toBe(true)
    const decisions = current.createDrizzleDecisionStore(db, 'tenant-a', 's1')
    expect(await decisions.get('settled')).toMatchObject({ status: 'complete', decision: 'approve', reason: 'customer asked', outcome: call('settled') })
    expect((await decisions.get('waiting'))?.messages.map(message => message.content)).toEqual(['Book a table for two'])
    expect(await decisions.claim('waiting', 'deny')).toMatchObject({ status: 'claimed', decision: 'deny' })
    await expect(pool.query("INSERT INTO agentskit_chat_sessions (tenant_id, session_id, cursor, snapshot) VALUES ('t', 'bad', -1, '{}')")).rejects.toThrow()
    upgraded = await schemaShape(pool)
  })
  await withDatabase(async (db, pool) => {
    await current.migrateChatSchema(db)
    expect(await schemaShape(pool)).toEqual(upgraded)
  })
}, 60000)
