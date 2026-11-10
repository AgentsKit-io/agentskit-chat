# @agentskit/chat-drizzle-pg

Postgres/Drizzle storage for AgentsKit Chat: session storage and tool-decision store, plus the schema migration.

This package is the standalone entry point for `@agentskit/chat/drizzle-pg`; both expose the same API.

```ts
import { createDrizzleSessionStorage, migrateChatSchema } from '@agentskit/chat-drizzle-pg'
```

Requires `drizzle-orm` and `@agentskit/chat` as peer dependencies.
