import { and, eq, sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { deserializeMessages, serializeMessages } from '@agentskit/core'
import type { MemoryRecord, ToolCall, ToolDecisionRecord, ToolDecisionStore } from '@agentskit/core'
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

type StoredDecision = { readonly messages: MemoryRecord; readonly outcome?: ToolCall }

/** One row per confirmation-required tool call; `status` is the claim that admits a single execution. */
export const chatDecisionTable = pgTable('agentskit_chat_decisions', {
  tenantId: text('tenant_id').notNull(),
  sessionId: text('session_id').notNull(),
  toolCallId: text('tool_call_id').notNull(),
  status: text('status').$type<ToolDecisionRecord['status']>().notNull(),
  decision: text('decision').$type<'approve' | 'deny'>(),
  reason: text('reason'),
  record: jsonb('record').$type<StoredDecision>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.tenantId, table.sessionId, table.toolCallId] })])

export const chatDecisionDDL = `CREATE TABLE IF NOT EXISTS agentskit_chat_decisions (
  tenant_id text NOT NULL, session_id text NOT NULL, tool_call_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'claimed', 'complete', 'failed', 'denied')),
  decision text CHECK (decision IN ('approve', 'deny')), reason text,
  record jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, session_id, tool_call_id)
)`

/**
 * Durable upstream ToolDecisionStore for one authorized tenant and session. The pending → claimed
 * transition is a single conditional UPDATE, so concurrent decisions admit exactly one execution.
 */
export const createDrizzleDecisionStore = (db: NodePgDatabase, tenantId: string, sessionId: string): ToolDecisionStore => {
  if (!tenantId.trim() || tenantId.length > 256 || !sessionId.trim() || sessionId.length > 256) throw new TypeError('Non-empty tenant and session IDs of at most 256 characters are required.')
  const key = (toolCallId: string) => and(eq(chatDecisionTable.tenantId, tenantId), eq(chatDecisionTable.sessionId, sessionId), eq(chatDecisionTable.toolCallId, toolCallId))
  const columns = { toolCallId: chatDecisionTable.toolCallId, status: chatDecisionTable.status, decision: chatDecisionTable.decision, reason: chatDecisionTable.reason, record: chatDecisionTable.record }
  const decode = (row: { toolCallId: string; status: ToolDecisionRecord['status']; decision: 'approve' | 'deny' | null; reason: string | null; record: StoredDecision }): ToolDecisionRecord => ({
    toolCallId: row.toolCallId, status: row.status, messages: deserializeMessages(row.record.messages),
    ...(row.decision ? { decision: row.decision } : {}), ...(row.reason === null ? {} : { reason: row.reason }), ...(row.record.outcome ? { outcome: row.record.outcome } : {}),
  })
  const encode = (record: ToolDecisionRecord): StoredDecision => ({ messages: serializeMessages(record.messages), ...(record.outcome ? { outcome: record.outcome } : {}) })
  return {
    putPending: async record => {
      const inserted = await db.insert(chatDecisionTable).values({ tenantId, sessionId, toolCallId: record.toolCallId, status: 'pending', record: encode(record) }).onConflictDoNothing().returning({ toolCallId: chatDecisionTable.toolCallId })
      if (inserted.length === 0) {
        const [existing] = await db.select(columns).from(chatDecisionTable).where(key(record.toolCallId))
        if (!existing || existing.status !== 'pending') throw new TypeError('Tool-call ID already belongs to another proposal.')
      }
    },
    get: async toolCallId => {
      const [row] = await db.select(columns).from(chatDecisionTable).where(key(toolCallId))
      return row ? decode(row) : undefined
    },
    claim: async (toolCallId, decision, reason) => {
      const [row] = await db.update(chatDecisionTable).set({ status: 'claimed', decision, reason: reason ?? null, updatedAt: sql`now()` })
        .where(and(key(toolCallId), eq(chatDecisionTable.status, 'pending'))).returning(columns)
      return row ? decode(row) : undefined
    },
    settle: async record => {
      if (record.status === 'pending' || record.status === 'claimed' || !record.decision) throw new TypeError('Only a claimed decision can be settled with a terminal status.')
      const rows = await db.update(chatDecisionTable).set({ status: record.status, record: encode(record), updatedAt: sql`now()` })
        .where(and(key(record.toolCallId), eq(chatDecisionTable.status, 'claimed'), eq(chatDecisionTable.decision, record.decision)))
        .returning({ toolCallId: chatDecisionTable.toolCallId })
      if (rows.length !== 1) throw new TypeError('Decision settlement requires the matching claim.')
    },
  }
}
