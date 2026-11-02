import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { postgresChatMemory, postgresChatMigrationSql } from '@agentskit/memory/postgres'
import { postgresCostMigrationSql, postgresCostStore } from '@agentskit/observability/postgres'
import type { ChatDefinition } from '@agentskit/chat'
import { createChatHandler } from '@agentskit/chat/server'
import { SessionSnapshotSchema } from '@agentskit/chat/protocol'
import { chatDecisionDDL, chatSessionDDL, createDrizzleDecisionStore, createDrizzleSessionStorage } from '@agentskit/chat/drizzle-pg'

type AdapterFactory = ChatDefinition['chat']['adapter']

const check = (value: unknown, criterion: string): void => { if (!value) throw new Error(criterion) }

/** 1000 prompt + 500 completion tokens per model call at 1 USD per 1M tokens: 0.0015 USD each. */
const usage = { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
const callUsd = 0.0015
/** Two metered turns fit (0 + 0.002, then 0.0015 + 0.002); the third (0.003 + 0.002) exceeds the cap. */
const capUsd = 0.0045
const reserveUsd = 0.002

/**
 * One complete turn through the public handler with every durable port in PostgreSQL: SessionStorage and
 * ToolDecisionStore from `@agentskit/chat/drizzle-pg`, upstream ChatMemory and CostStore. A fresh handler
 * per request means only the database carries state, as on Workers or a restarted Node process.
 */
export const runTurnServerContract = async (db: NodePgDatabase): Promise<string[]> => {
  for (const ddl of [chatSessionDDL, chatDecisionDDL, postgresChatMigrationSql, postgresCostMigrationSql]) await db.execute(sql.raw(ddl))
  const tenant = `turn-${crypto.randomUUID()}`
  const sessionId = `session-${crypto.randomUUID()}`
  const passed: string[] = []
  const writes: unknown[] = []
  let modelCalls = 0
  const adapter: AdapterFactory = {
    createSource: request => ({
      async *stream() {
        modelCalls++
        if (request.messages.some(message => message.role === 'tool')) yield { type: 'text', content: 'Saved.' }
        else yield { type: 'tool_call', toolCall: { id: 'call-1', name: 'save_expense', args: '{"amount":42}' } }
        yield { type: 'usage', usage }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
  const memory = () => postgresChatMemory({ db, tenantId: tenant, sessionId })
  const costStore = postgresCostStore({ db })
  const post = (event: string, payload: unknown): Promise<Response> => createChatHandler({
    resolveDefinition: () => ({ id: 'turn-contract', chat: { adapter, memory: memory(), tools: [{
      name: 'save_expense', requiresConfirmation: true, execute: args => { writes.push(args); return 'expense saved' },
    }] } }),
    sessionStorage: () => createDrizzleSessionStorage(db, tenant),
    decisions: (_context, id) => createDrizzleDecisionStore(db, tenant, id),
    cost: () => ({ store: costStore, tenant, capUsd, reserveUsd, priceUsd: tokens => tokens.totalTokens / 1_000_000, model: 'synthetic-model', source: 'contract' }),
  })(new Request('http://localhost/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocol: 'agentskit.chat.turn', version: 1, eventId: crypto.randomUUID(), sessionId, turnId: crypto.randomUUID(), sequence: 0,
      emittedAt: new Date().toISOString(), event, payload }),
  }))
  const lines = async (response: Response) => (await response.text()).trim().split(/\r?\n/).map(line => JSON.parse(line) as {
    event: string; payload: { status?: string; error?: unknown; quota?: { utilization: number; warning: boolean }; messages?: { role: string; content: string }[] }
  })
  const near = (actual: number | undefined, expected: number): boolean => actual !== undefined && Math.abs(actual - expected) < 1e-9

  try {
    const proposal = await post('client.turn.submit', { input: 'I spent 42 on lunch' })
    check(proposal.status === 200, `submit returns 200 (got ${proposal.status})`)
    const proposed = await lines(proposal)
    check(proposed.every(line => line.event === 'server.turn.snapshot' && !line.payload.error), 'submit streams snapshots without errors')
    check(proposed[0]?.payload.quota?.warning === false && near(proposed[0].payload.quota.utilization, reserveUsd / capUsd), 'first snapshot carries the quota of the reservation')
    check(JSON.stringify(proposed.at(-1)).includes('requires_confirmation'), 'tool proposal waits for confirmation')
    check((await createDrizzleDecisionStore(db, tenant, sessionId).get('call-1'))?.status === 'pending', 'pending decision persisted in Postgres')
    check(writes.length === 0, 'no tool execution before approval')
    passed.push('submit: proposal pending in Postgres, quota announced, no side effect')

    const decided = await post('client.action.decide', { token: 'call-1', decision: 'approve' })
    check(decided.status === 200, `decide returns 200 (got ${decided.status})`)
    const resumed = await lines(decided)
    check(resumed.every(line => !line.payload.error) && resumed.at(-1)?.payload.status === 'complete', 'decide streams to a complete snapshot')
    check(JSON.stringify(resumed).includes('expense saved') && JSON.stringify(resumed).includes('Saved.'), 'tool result and resumed answer streamed')
    check(writes.length === 1 && modelCalls === 2, `one tool execution and two model calls (got ${writes.length}, ${modelCalls})`)
    const decision = await createDrizzleDecisionStore(db, tenant, sessionId).get('call-1')
    check(decision?.status === 'complete' && decision.decision === 'approve', 'decision settled in Postgres')
    passed.push('decide: one atomic claim, one tool execution, model resumed')

    const transcript = await memory().load()
    check(transcript.map(message => message.role).join() === 'user,assistant,tool,assistant' && transcript.at(-1)?.content === 'Saved.', `memory transcript in Postgres (got ${transcript.map(message => message.role).join()})`)
    const snapshot = SessionSnapshotSchema.optional().parse(await createDrizzleSessionStorage(db, tenant).load(sessionId))
    check(snapshot !== undefined && snapshot.cursor > 0 && snapshot.activeTurn === undefined, 'session snapshot persisted with the turn lease released')
    passed.push('memory and session state survive in Postgres across fresh handlers')

    const window = await costStore.window({ tenant, capUsd })
    check(near(window.spentUsd, 2 * callUsd) && near(window.reservedUsd, 0), `two model calls committed, nothing held (spent ${window.spentUsd}, reserved ${window.reservedUsd})`)
    const blocked = await post('client.turn.submit', { input: 'and 10 on coffee' })
    check(blocked.status === 402 && (await blocked.json() as { error: { code: string } }).error.code === 'QUOTA_EXCEEDED', `turn above the ceiling returns 402 QUOTA_EXCEEDED (got ${blocked.status})`)
    check(modelCalls === 2, 'no model call above the ceiling')
    const after = await costStore.window({ tenant, capUsd })
    check(near(after.spentUsd, 2 * callUsd) && near(after.reservedUsd, 0), 'denied reservation holds nothing')
    check(SessionSnapshotSchema.parse(await createDrizzleSessionStorage(db, tenant).load(sessionId)).activeTurn === undefined, 'denied turn releases its lease')
    passed.push('cost ceiling: real spend committed in Postgres, next turn denied with 402 before the model')
    return passed
  } finally {
    await createDrizzleSessionStorage(db, tenant).delete?.(sessionId)
    for (const table of ['agentskit_chat_decisions', 'agentskit_chat_memory', 'agentskit_cost_window', 'agentskit_cost_reservation', 'agentskit_usage_ledger']) {
      await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenant}`)
    }
  }
}
