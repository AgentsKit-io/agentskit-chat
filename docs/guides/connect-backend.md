---
title: Connect a backend
description: Mount createChatHandler and optional Ask backends for production chat.
---

# Connect a backend

## Chat HTTP handler

```ts
import { createChatHandler } from '@agentskit/chat/server'
import { supportChat } from './chat'

export default createChatHandler({ definition: supportChat })
```

Works with Web-standard `Request` / `Response` (Next.js route handlers, Hono,
Workers, Express via adapter). Details: [server](/docs/server), [deployment](/docs/deployment).

## Ask / grounded Q&A

When the model must answer from your docs:

```ts
import { createAskServiceHandler } from '@agentskit/chat/server'

// Host injects retriever + generator + auth — Chat owns the protocol surface.
export const POST = createAskServiceHandler({ /* host adapters */ })
```

Full contract: [backend](/docs/backend).

## Sessions

Persist application metadata across clients with `SessionStorage` while AgentsKit
remains message authority — [sessions](/docs/sessions).

## Checklist

1. Shared `defineChat` definition
2. `createChatHandler` (or local adapter) for turns
3. Optional Ask handler for grounded misses
4. Auth + rate limits on the host
5. Native renderer on each client
