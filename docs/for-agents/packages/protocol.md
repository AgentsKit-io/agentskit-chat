# Protocol package handoff

## Ownership

`packages/protocol` owns the versioned turn and component wire envelopes, Zod schemas, encode/decode functions, safe diagnostics, bounded JSON validation, compatibility policy, and shared fixture corpus.

It does not own the AgentsKit controller, `StreamChunk`, `AgentEvent`, a lifecycle reducer, transport, persistence, or renderer state.

## Read first

- [`../../architecture/adrs/0004-snapshot-first-turn-protocol.md`](../../architecture/adrs/0004-snapshot-first-turn-protocol.md)
- [`../../architecture/adrs/0005-upstream-memory-record-validation.md`](../../architecture/adrs/0005-upstream-memory-record-validation.md)
- [`../../architecture/adrs/0007-closed-application-component-manifest.md`](../../architecture/adrs/0007-closed-application-component-manifest.md)
- [`../../protocol/v1.md`](../../protocol/v1.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)

## Compatibility guardrail

Optional additive v1 fields are compatible. Required-field or semantic changes need v2, migration fixtures, and a new ADR. Never silently coerce versions or expose raw validator diagnostics.

Delegate message-record validation to `@agentskit/core/memory-validation`. Do not recreate canonical message, content-part, tool-call, token, or memory schemas here; missing capability must be fixed and released in AgentsKit first.

## Checks

```bash
pnpm --filter @agentskit/chat-protocol lint
pnpm --filter @agentskit/chat-protocol test
pnpm --filter @agentskit/chat-protocol build
```
