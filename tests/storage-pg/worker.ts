import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { chatSessionDDL, createDrizzleSessionStorage } from '@agentskit/chat/drizzle-pg'
import { runSessionStorageContract } from './contract.js'

export default {
  async fetch(_request: Request, _env: unknown, context: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    // Local trust-authenticated Docker only. Production passes Hyperdrive's connectionString.
    const client = new Client({ host: '127.0.0.1', port: 56439, user: 'chat_test', database: 'chat_test' })
    try {
      await client.connect()
      await client.query(chatSessionDDL)
      const criteria = await runSessionStorageContract(tenant => createDrizzleSessionStorage(drizzle(client), tenant))
      return Response.json({ runtime: 'workerd-request-client', criteria })
    } catch (error) {
      return Response.json({ failed: error instanceof Error ? error.message : 'Contract failed' }, { status: 500 })
    } finally { context.waitUntil(client.end()) }
  },
}
