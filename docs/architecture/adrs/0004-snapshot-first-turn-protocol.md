# ADR-0004: Snapshot-first v1 turn protocol

**Status:** Accepted

**Date:** 2026-07-11

## Context

React, React Native, and Ink need one versioned application protocol that can cross future client/server boundaries without redefining the AgentsKit controller or adapter stream.

Transporting raw `StreamChunk` values would expose adapter-level details and require clients to implement another lifecycle reducer. Reusing `AgentEvent` would confuse observer telemetry with durable application state.

## Decision

`@agentskit/chat-protocol` owns a versioned, runtime-validated event envelope, inert typed decoder diagnostics, and committed conformance fixtures.

Version 1 begins with three events:

- `client.turn.submit` carries validated user input;
- `server.turn.snapshot` carries the wire projection of canonical AgentsKit messages, status, usage, and optional safe diagnostic;
- `server.turn.diagnostic` carries a safe typed failure.

Streaming uses successive full snapshots with increasing sequence numbers and stable message ids. AgentsKit remains the lifecycle authority. Stateful sequence rejection, transport, sessions, actions, and components remain in their owning issues.

Within v1, additive optional fields are compatible and stripped by older decoders. Unknown events and versions are inert. Required-field or semantic changes require v2, migrations, compatibility fixtures, and an ADR.

## Alternatives considered

1. Raw `StreamChunk` transport — rejected because it creates a second reducer.
2. `AgentEvent` transport — rejected because it is observer telemetry.
3. Per-renderer stores — rejected because behavior would drift.
4. Defining future action and session events now — rejected as speculative.

## Consequences

- All proof renderers consume the same schema and fixture corpus.
- Full snapshots are larger than deltas but materially simpler and safer for v0.
- Protocol diagnostics never expose raw validation trees or untrusted payloads.
- Future protocol evolution is explicit and compatibility-tested.
