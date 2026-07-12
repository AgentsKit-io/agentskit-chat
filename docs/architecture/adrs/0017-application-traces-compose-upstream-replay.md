# ADR-0017: Application traces compose upstream replay

**Status:** Accepted  
**Date:** 2026-07-11

## Context

AgentsKit Chat already emits deterministic-route and capability-policy decisions. Developers need one committed fixture explaining application outcomes and comparing them across native renderers. AgentsKit already owns adapter recording, cassettes, playback, time travel, and eval reporting.

## Decision

`@agentskit/chat-devtools` captures application-only records in causal append order. Records have a monotonic sequence, optional prior parent, category, timestamp, and bounded JSON detail. Configured field names are recursively redacted before storage. Returned snapshots and reports are deeply immutable.

A versioned replay fixture stores these records beside an upstream `Cassette`. Cassette serialization and validation delegate to `@agentskit/eval/replay`; model requests and chunks are never independently recorded here. Semantic renderer parity compares ordered outcomes by turn identity and reports missing or different values without comparing pixels or framework internals.

## Alternatives considered

1. Build a second recording adapter — rejected because AgentsKit owns replay.
2. Add traces to the turn wire protocol — rejected because developer fixtures are not client/server state.
3. Snapshot native markup — rejected because DOM, mobile, and terminal layouts are intentionally different.

## Consequences

- Hosts connect existing route/policy callbacks to one capture without changing execution.
- Redaction covers application trace detail only; upstream cassettes may contain prompts and require separate handling.
- A fixture can be committed and replayed without live model access.
- Renderer diagnostics prove semantic equivalence, not visual identity.

## Upstream adoption

Inspected AgentsKit revision `978ce3d77be7bbf76094b5919d240e50091bc824` and `@agentskit/eval@0.4.17`. Reused `createRecordingAdapter`, `createReplayAdapter`, `Cassette`, `serializeCassette`, and `parseCassette` from `@agentskit/eval/replay`. No upstream source or behavior is copied and no upstream gap blocks this application-only composition.
