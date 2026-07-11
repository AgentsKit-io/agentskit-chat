# Protocol package handoff

## Ownership

`packages/protocol` owns the versioned application wire envelope, Zod schemas, encode/decode functions, safe diagnostics, compatibility policy, and shared fixture corpus.

It does not own the AgentsKit controller, `StreamChunk`, `AgentEvent`, a lifecycle reducer, transport, persistence, or renderer state.

## Read first

- [`../../architecture/adrs/0004-snapshot-first-turn-protocol.md`](../../architecture/adrs/0004-snapshot-first-turn-protocol.md)
- [`../../protocol/v1.md`](../../protocol/v1.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)

## Compatibility guardrail

Optional additive v1 fields are compatible. Required-field or semantic changes need v2, migration fixtures, and a new ADR. Never silently coerce versions or expose raw validator diagnostics.

## Checks

```bash
pnpm --filter @agentskit/chat-protocol lint
pnpm --filter @agentskit/chat-protocol test
pnpm --filter @agentskit/chat-protocol build
```
