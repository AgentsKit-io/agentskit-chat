---
title: Add RAG
description: Attach AgentsKit retrieval to a Chat definition so answers cite your corpus.
---

# Add RAG

AgentsKit Chat does **not** reimplement RAG. Wire AgentsKit retrievers into the
same `chat` config you already pass to `defineChat`.

## Pattern

1. Build a retriever with `@agentskit/rag` (or your host pipeline).
2. Pass it on the AgentsKit `ChatConfig` / tools surface your adapter expects.
3. Prefer **deterministic local answers** for exact doc questions, and escalate
   to grounded Ask when you need semantic retrieval ([backend](/docs/backend)).

```ts
import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const createDocsChat = (adapter: AdapterFactory) =>
  defineChat({
    id: 'docs',
    chat: {
      adapter,
      systemPrompt: 'Cite sources. Prefer links over guesses.',
      // attach AgentsKit memory / tools / retriever here — same as any AgentsKit app
    },
  })
```

## Grounded Ask path

For site assistants and support bots that must cite pages:

- Use [`createAskServiceHandler`](/docs/backend) for the trusted backend boundary.
- Keep the public protocol stable; inject retrieval and generation on the host.
- Local deterministic knowledge can answer exact questions without a model.

## See also

- [Backend](/docs/backend)
- [Server handler](/docs/server)
- [AgentsKit RAG docs](https://www.agentskit.io/docs)
