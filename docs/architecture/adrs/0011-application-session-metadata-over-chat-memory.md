# ADR-0011: Application session metadata over AgentsKit ChatMemory

**Status:** Accepted

**Date:** 2026-07-11

## Context

Cross-client resume needs deterministic application state, protocol cursor, and confirmation bindings in addition to the canonical message history. AgentsKit already owns message persistence through `ChatMemory`; duplicating messages in an application envelope would create conflicting authorities.

## Decision

AgentsKit Chat defines a runtime-validated `agentskit.chat.session` v1 envelope containing only application metadata: session and definition identity, definition revision, monotonic cursor, deterministic route decisions, and confirmation bindings. Messages remain exclusively in the `ChatMemory` configured on `ChatDefinition.chat`.

`SessionStorage` is a host port with `load`, compare-and-set `save(snapshot, expectedCursor)`, and optional `delete`. A save returns `false` on conflict; last-write-wins storage is not conformant. `resumeChatSession` accepts missing state as a new session, explicitly migrates the supported v0 envelope, and rejects corrupt, unsupported, foreign-session, or incompatible-definition state before constructing a session. Renderers verify the prepared session identity and revision; they continue to use their official AgentsKit binding.

Pending, processing, and terminal confirmation records are persisted. A pending record remains bound to its original session and canonical tool-call id. Resolution first claims `approving`, `rejecting`, or `expiring` through CAS; only the winner delegates to the upstream controller and then advances to the matching terminal status through a second CAS. A crash leaves an accurate processing record for host reconciliation rather than falsely claiming completion or permitting replay.

## Alternatives considered

1. Store messages inside the session envelope — rejected because `ChatMemory` already owns them.
2. Bundle localStorage, filesystem, and database adapters — rejected because upstream Core and Memory already provide message adapters and hosts have different metadata stores.
3. Silently accept any snapshot version or definition — rejected because partial hydration can corrupt state or weaken confirmation binding.

## Consequences

- Cross-client hosts share two coordinated concerns: upstream `ChatMemory` for messages and `SessionStorage` for application metadata.
- Definition revisions make compatibility explicit.
- The v0-to-v1 migration is narrow and tested; future incompatible formats require a new migration and ADR.
- Storage failures reject explicit persistence calls but never introduce a second chat lifecycle.

## Upstream adoption

Inspected AgentsKit Core memory types, serialization, controller hydration and confirmation execution, plus Memory filesystem, SQLite, Redis, and Turso adapters. Reused `ChatMemory`, canonical messages/tool calls, and controller `approve`/`deny`. Added only application metadata and host storage composition. No upstream source or behavior is copied and no upstream gap exists.
