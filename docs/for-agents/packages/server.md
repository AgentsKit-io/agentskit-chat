# Server package handoff

## Ownership

`packages/server` owns the Web-standard application boundary, trusted host-context seam, request validation, snapshot/Ask streaming, outer deadline/cancellation, trusted site-policy composition, and composition of existing session/message storage.

It does not own adapters, provider fetch, controller state, stream reduction, tools, confirmation execution, message persistence, authentication implementations, or framework-specific HTTP adapters.

## Read first

- [`../../architecture/adrs/0012-web-standard-snapshot-handler.md`](../../architecture/adrs/0012-web-standard-snapshot-handler.md)
- [`../../server.md`](../../server.md)
- [`../../backend.md`](../../backend.md)
- [`../../protocol/v1.md`](../../protocol/v1.md)
- [`../../sessions.md`](../../sessions.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)

## Guardrails

Authenticate before body parsing. Never derive trusted context, site, corpus,
assistant, components, actions, subject, or tenant from a protocol payload.
Validate with `decodeTurnEvent` or the Ask backend schemas; emit only protocol
snapshots/events/diagnostics. Use upstream `createChatController`, `ChatMemory`,
RAG/Retriever, and provider adapters. Forward cancellation through every host
seam and preserve the outer deadline. Ask telemetry must never contain prompts,
answers, sources, credentials, subject IDs, or session IDs.

## Checks

```bash
pnpm --filter @agentskit/chat-server lint
pnpm --filter @agentskit/chat-server test
pnpm --filter @agentskit/chat-server build
```
