# Fumadocs framework dogfood handoff

## Ownership

`apps/docs` is the public Fumadocs portal and the complete React dogfood host for AgentsKit Chat. It compiles the repository's root `docs/` directory in place; do not create a second prose corpus inside the app.

The host may compose public framework contracts, configure deployment-specific adapters, and style renderer slots. It must not implement model execution, semantic retrieval, memory, controller lifecycle, or protocol validation. Generic gaps belong upstream in AgentsKit.

## Boundaries

- `lib/knowledge.ts` is a small, bounded public artifact with integrity verification. Exact matching stays in `@agentskit/chat`.
- `lib/chat-definition.ts` is the single definition rendered by the published React binding. Other clients continue to consume the same framework-neutral definition contract.
- `lib/ask-handler.ts` is the host composition seam around `createAskServiceHandler`; retrieval and generation remain injected AgentsKit adapters.
- `/api/ask` fails closed unless the deployment explicitly configures a hosted endpoint or injects self-hosted adapters.
- `/api/search` is Fumadocs navigation search only. It is never a semantic Ask retriever.
- `/raw`, `/llms.txt`, and `/llms-full.txt` expose only the canonical public corpus.

The maturity claim is governed by Proposed ADR-0027 and needs HITL approval before it becomes Accepted.

## Checks

```bash
pnpm --filter @agentskit/chat-docs lint
pnpm --filter @agentskit/chat-docs test
pnpm --filter @agentskit/chat-docs build
pnpm --filter @agentskit/chat-docs test:e2e
pnpm docs:bridge:index
pnpm docs:bridge:gate
```
