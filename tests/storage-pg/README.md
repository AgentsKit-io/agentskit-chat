# Local PostgreSQL acceptance contract

Only synthetic data and deterministic adapters are used. No provider account or credential is needed. The database is localhost-only with trust authentication; use a disposable container, never a production database.

```sh
docker run --detach --name ch-b-postgres --publish 127.0.0.1:56439:5432 --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_USER=chat_test --env POSTGRES_DB=chat_test postgres:16
docker exec ch-b-postgres pg_isready -U chat_test
pnpm --filter @agentskit/chat-protocol build
pnpm --filter @agentskit/chat build
pnpm test:storage:pg:types
pnpm test:storage:pg
# RF-06 only (what CI runs): the metered turn on Node and in a local workerd started by the test.
pnpm test:runtime:pg
pnpm exec wrangler dev --config tests/storage-pg/wrangler.jsonc --port 8788 --local
# In another terminal; HTTP 200 with five criterion results is the acceptance evidence.
curl --fail http://127.0.0.1:8788/
# Stop wrangler, then remove only this task's container.
docker rm --force ch-b-postgres
```

The same `runSessionStorageContract` executes with Node's Pool and workerd's request Client. It removes its UUID session rows in finally and does not touch pre-existing rows. The Worker has no deployed route or account dependency. Contract tables are created only in this test database. A real Neon/Hyperdrive run remains pending, so these checks do not establish production readiness.

`runTurnServerContract` (RF-06) runs one complete turn through `createChatHandler`, with a fresh handler for each request. Sessions and decisions come from `@agentskit/chat/drizzle-pg`, upstream `postgresChatMemory` holds the messages, and upstream `postgresCostStore` holds the spend under a cost ceiling. The turn is submit, then pending confirmation, then approve, then tool, then the resumed answer. Spend is committed, and the next turn gets 402 `QUOTA_EXCEEDED` before the model is called. `node.test.ts` runs it on a Node `Pool`. `workerd.test.ts` starts `wrangler dev --local` with a temporary HOME and calls the Worker's `/turn` route. The CI job `runtime-contract` runs both against a `postgres:16` service.

The Wrangler fixture aliases the installed Drizzle node-postgres entry because Wrangler 4.147.0 failed to resolve that subpath directly in this workspace. It uses the existing dependency, without vendoring or provider coupling.
