import { and, eq, sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { SessionSnapshotSchema } from '@agentskit/chat-protocol'
import type { SessionSnapshot } from '@agentskit/chat-protocol'
import type { SessionStorage } from './index.js'

/** Application envelopes only; canonical messages belong to upstream ChatMemory. */
export const chatSessionTable = pgTable('agentskit_chat_sessions', {
  tenantId: text('tenant_id').notNull(),
  sessionId: text('session_id').notNull(),
  cursor: integer('cursor').notNull(),
  snapshot: jsonb('snapshot').$type<SessionSnapshot>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.tenantId, table.sessionId] })])

export const chatSessionDDL = `CREATE TABLE IF NOT EXISTS agentskit_chat_sessions (
  tenant_id text NOT NULL, session_id text NOT NULL, cursor integer NOT NULL CHECK (cursor >= 0),
  snapshot jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, session_id)
)`

/** Pass drizzle(pool) on Node or drizzle(client) for the lifetime of a Worker request. */
export const createDrizzleSessionStorage = (db: NodePgDatabase, tenantId: string): SessionStorage => {
  if (!tenantId.trim() || tenantId.length > 256) throw new TypeError('A non-empty tenant ID of at most 256 characters is required.')
  const key = (sessionId: string) => and(eq(chatSessionTable.tenantId, tenantId), eq(chatSessionTable.sessionId, sessionId))
  return {
    load: async (sessionId, signal) => {
      signal?.throwIfAborted()
      const [row] = await db.select({ snapshot: chatSessionTable.snapshot }).from(chatSessionTable).where(key(sessionId))
      signal?.throwIfAborted()
      return row ? SessionSnapshotSchema.parse(row.snapshot) : undefined
    },
    save: async (input, expectedCursor, signal) => {
      signal?.throwIfAborted()
      const snapshot = SessionSnapshotSchema.parse(input)
      if (expectedCursor !== undefined && (!Number.isSafeInteger(expectedCursor) || expectedCursor < 0 || snapshot.cursor <= expectedCursor)) {
        throw new TypeError('CAS requires a non-negative expected cursor and a strictly newer snapshot cursor.')
      }
      const rows = expectedCursor === undefined
        ? await db.insert(chatSessionTable).values({ tenantId, sessionId: snapshot.sessionId, cursor: snapshot.cursor, snapshot })
          .onConflictDoNothing().returning({ cursor: chatSessionTable.cursor })
        : await db.update(chatSessionTable).set({ cursor: snapshot.cursor, snapshot, updatedAt: sql`now()` })
          .where(and(key(snapshot.sessionId), eq(chatSessionTable.cursor, expectedCursor)))
          .returning({ cursor: chatSessionTable.cursor })
      // Do not throw after a successful write: callers must observe the committed CAS result.
      return rows.length === 1
    },
    delete: async (sessionId, signal) => {
      signal?.throwIfAborted()
      await db.delete(chatSessionTable).where(key(sessionId))
    },
  }
}
