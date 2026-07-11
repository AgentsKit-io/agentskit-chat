# ADR-0010: Lifecycle lineage and monotonic snapshot cursor

**Status:** Accepted

**Date:** 2026-07-11

## Context

ADR-0004 chose complete turn snapshots and deferred stateful sequence rejection. Retry, edit, and regeneration now need explicit ancestry, while reconnect and duplicate delivery must not roll a client backward.

AgentsKit already owns streaming, abort, retry, edit, regeneration, message mutation, and late-chunk rejection. Reimplementing those behaviors in this framework would create a competing lifecycle.

## Decision

The optional v1 snapshot `lineage` field records the operation and optional parent turn/source message identities. Because it is additive and older v1 decoders discard unknown fields, the envelope version remains 1.

`createSnapshotEvent` projects canonical AgentsKit messages and explicit operation ancestry. `createTurnSnapshotCursor(sessionId)` fixes the trusted session before delivery, accepts its first validated complete snapshot as reconnect state, then accepts only a greater sequence. Duplicate, stale, foreign-session, malformed, and non-snapshot events are inert. Accepted state is deeply frozen. The cursor does not merge messages or interpret stream chunks.

Renderers delegate lifecycle operations directly to their published AgentsKit binding. They may provide native controls, but cannot own lifecycle state or message mutation.

## Alternatives considered

1. A second renderer lifecycle store — rejected because AgentsKit is authoritative.
2. Delta events — rejected because they require another reducer and weaken reconnect simplicity.
3. Protocol v2 — rejected because optional lineage is backward-compatible in v1.
4. Deduplication by event id only — rejected because it would still permit older snapshots to roll state backward.

## Consequences

- Lifecycle ancestry is transportable without changing canonical AgentsKit messages.
- Reconnect and duplicate delivery have one framework-neutral monotonic rule.
- Sequence numbers are session-monotonic; a new session begins with a new cursor.
- A future delta protocol or cross-session merge requires a new ADR and protocol version.
