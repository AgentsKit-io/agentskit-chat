import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { expect, it } from 'vitest'
import { chatDecisionDDL, chatSessionDDL, createDrizzleDecisionStore, createDrizzleSessionStorage } from '@agentskit/chat/drizzle-pg'
import { runSessionStorageContract } from './contract.js'
import { runDecisionStoreContract } from './decision-contract.js'

it('Node pool: Postgres 16 SessionStorage acceptance contract', async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 56439, user: 'chat_test', database: 'chat_test' })
  try {
    await pool.query(chatSessionDDL)
    const results = await runSessionStorageContract(tenant => createDrizzleSessionStorage(drizzle(pool), tenant))
    expect(results).toHaveLength(5)
    console.log(JSON.stringify({ runtime: 'node-pool', criteria: results }))
  } finally { await pool.end() }
}, 120000)

it('Node pool: Postgres 16 ToolDecisionStore acceptance contract', async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 56439, user: 'chat_test', database: 'chat_test', max: 20 })
  try {
    await pool.query(chatSessionDDL)
    await pool.query(chatDecisionDDL)
    const db = drizzle(pool)
    const results = await runDecisionStoreContract({
      sessions: tenant => createDrizzleSessionStorage(db, tenant),
      decisions: (tenant, sessionId) => createDrizzleDecisionStore(db, tenant, sessionId),
    })
    expect(results).toHaveLength(3)
    console.log(JSON.stringify({ runtime: 'node-pool', criteria: results }))
  } finally { await pool.end() }
}, 300000)
