# Protocol package handoff

## Ownership

`packages/protocol` owns the versioned turn and component wire envelopes, Zod schemas, encode/decode functions, safe diagnostics, bounded JSON validation, compatibility policy, and shared fixture corpus.

It does not own the AgentsKit controller, `StreamChunk`, `AgentEvent`, a lifecycle reducer, transport, persistence, or renderer state.

It owns the application-session envelope schema and compatibility decoder, but not its storage implementation. The session envelope must never contain canonical messages; those remain in upstream `ChatMemory`.

It also owns the external Ask service v1 event schema, NDJSON bounds, and decoder. The fetch adapter, citation projection, and browser-memory composition remain in `packages/chat`.

It owns the additive Ask backend request, trusted site configuration, grounded
source, session record, usage, typed diagnostic, and privacy-safe metric v1
schemas. Authentication, site lookup, retrieval, generation, storage, rate
limiting, and metric export remain server-host capabilities.

It owns the accepted deterministic site-config, local-knowledge artifact, and unified-answer v1 envelopes, canonical SHA-256 serialization/verification, safe decoders, normalization rule, bounds, diagnostics, and conformance fixtures. Artifact generation, fetching, and caching remain host/Doc Bridge concerns; lookup and fallback composition remain in `packages/chat`.

## Read first

- [`../../architecture/adrs/0004-snapshot-first-turn-protocol.md`](../../architecture/adrs/0004-snapshot-first-turn-protocol.md)
- [`../../architecture/adrs/0005-upstream-memory-record-validation.md`](../../architecture/adrs/0005-upstream-memory-record-validation.md)
- [`../../architecture/adrs/0007-closed-application-component-manifest.md`](../../architecture/adrs/0007-closed-application-component-manifest.md)
- [`../../protocol/v1.md`](../../protocol/v1.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [`../../protocol/deterministic-answers.md`](../../protocol/deterministic-answers.md)
- [`../../architecture/adrs/0024-deterministic-answer-plane.md`](../../architecture/adrs/0024-deterministic-answer-plane.md)
- [`../../backend.md`](../../backend.md)
- [`../../architecture/adrs/0026-trusted-ask-backend-vertical.md`](../../architecture/adrs/0026-trusted-ask-backend-vertical.md)

## Compatibility guardrail

Optional additive v1 fields are compatible. Required-field or semantic changes need v2, migration fixtures, and a new ADR. Never silently coerce versions or expose raw validator diagnostics.

Delegate message-record validation to `@agentskit/core/memory-validation`. Do not recreate canonical message, content-part, tool-call, token, or memory schemas here; missing capability must be fixed and released in AgentsKit first.

## Checks

```bash
pnpm --filter @agentskit/chat-protocol lint
pnpm --filter @agentskit/chat-protocol test
pnpm --filter @agentskit/chat-protocol build
```
