# ADR-0024: Structured turns use the canonical AgentsKit tool loop

**Status:** Proposed

**Date:** 2026-07-13

## Context

AgentsKit Chat needs a versioned application turn for ordered text, registered UI, field collection, evidence, and typed action proposals across all renderers. It must not create a second model loop, stream reducer, message store, or provider-specific structured-output protocol.

AgentsKit Core `ChatController` already owns conversational model/tool iterations, argument validation, tool-error feedback, cancellation, memory, observers, authorization, and iteration limits. Runtime `invokeStructured` is designed for autonomous Runtime calls, not for parallel use beside a mounted controller.

## Decision

AgentsKit Chat will own a versioned application-turn contract and compile it into an internal submit-turn `ToolDefinition` consumed by the existing `ChatController`.

The internal tool:

1. has a closed framework-reserved identity;
2. declares a public JSON Schema conformance-checked against the runtime turn schema;
3. is registered in the derived `ChatConfig` alongside host tools;
4. uses upstream argument validation and validates again at the application trust boundary;
5. performs no product side effect and returns a deterministic acknowledgement;
6. leaves accepted arguments in canonical tool-call history for memory and replay;
7. relies on Core to return invalid arguments to the model within `maxToolIterations`;
8. projects only validated turns to the public protocol and native renderers;
9. produces an inert semantic fallback if no valid turn is accepted.

Deterministic routes emit the same public application-turn contract without model dispatch. Action proposals are presentation intents only; trusted user/host intent later maps them to Core proposal, authorization, confirmation, and execution APIs.

Provider-native structured output may be an optional optimization only if it preserves identical validation, repair, persistence, replay, and fallback semantics.

## Consequences

### Positive

- One controller owns lifecycle, streaming, cancellation, memory, and tool iterations.
- The contract remains portable across model adapters and renderers.
- Accepted turns are replayable through canonical history.
- Model-produced proposals remain inert until trusted policy uses Core APIs.

### Negative

- Models and adapters without tool support require a semantic fallback.
- Turn arguments require strict size and redaction limits.
- Session compatibility fixtures must cover versions before and after structured turns.

### Neutral

- Runtime `invokeStructured` remains the public API for autonomous structured tasks.
- Defense in depth can validate at both JSON-Schema and application-schema boundaries.

## Alternatives considered

### Run `invokeStructured` beside `ChatController`

Rejected because it creates a second lifecycle and splits streaming, memory, cancellation, and observers.

### Parse JSON from assistant text

Rejected because it requires an independent repair loop and exposes partial provider output.

### Require provider-native response formats

Deferred because the portable tool loop already represents a closed structured result.

## Security and failure constraints

- Unknown fields, components, actions, and evidence kinds are rejected or inert.
- The internal tool cannot invoke host actions or arbitrary callbacks.
- Arguments are bounded and redacted before telemetry or transport.
- Duplicate submissions cannot cause product-side effects.
- Exhausted iterations, cancellation, and provider failure produce typed fallbacks.

## Review and acceptance

This ADR remains **Proposed** until human review approves the public schema, internal tool identity, duplicate policy, fallback behavior, and compatibility fixtures.

## References

- [ADR-0002](./0002-upstream-first-no-reimplementation.md)
- [ADR-0004](./0004-snapshot-first-turn-protocol.md)
- [ADR-0008](./0008-typed-actions-use-upstream-confirmation.md)
- [ADR-0021](./0021-ordered-assistant-content-records.md)
- [Public capability gap matrix](../public-capability-gap-matrix.md)
- [AgentsKit Runtime structured invocation PR #1051](https://github.com/AgentsKit-io/agentskit/pull/1051)
