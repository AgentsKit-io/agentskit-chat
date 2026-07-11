# Server package handoff

## Ownership

`packages/server` owns the Web-standard application boundary, trusted host-context seam, request validation, snapshot streaming, outer deadline/cancellation, and composition of existing session/message storage.

It does not own adapters, provider fetch, controller state, stream reduction, tools, confirmation execution, message persistence, authentication implementations, or framework-specific HTTP adapters.

## Read first

- [`../../architecture/adrs/0012-web-standard-snapshot-handler.md`](../../architecture/adrs/0012-web-standard-snapshot-handler.md)
- [`../../server.md`](../../server.md)
- [`../../protocol/v1.md`](../../protocol/v1.md)
- [`../../sessions.md`](../../sessions.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)

## Guardrails

Authenticate before body parsing. Never derive trusted context from a protocol payload. Validate with `decodeTurnEvent`; emit only protocol snapshots/diagnostics. Use upstream `createChatController` and `ChatMemory`. Forward cancellation through `controller.stop()` and preserve the outer deadline across all async host seams.

## Checks

```bash
pnpm --filter @agentskit/chat-server lint
pnpm --filter @agentskit/chat-server test
pnpm --filter @agentskit/chat-server build
```
