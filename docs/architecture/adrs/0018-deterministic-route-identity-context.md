# ADR-0018: Deterministic routes receive stable turn identity

**Status:** Accepted

**Date:** 2026-07-11

## Context

ADR-0006 caches deterministic responses by user-message identity, but route response callbacks previously received only input text. Application components need a stable identity that is unique per turn: a constant `instanceId` makes a later instance inert, while a process-global counter makes replay depend on unrelated sessions.

## Decision

`DeterministicRoute.response` receives an additive second context argument containing the application `sessionId` and optional upstream user `messageId`. Existing one-argument callbacks remain source-compatible. Component-producing routes derive their instance identity from the message identity, so replay/regenerate returns the cached frame and separate turns remain independent.

The context contains identity metadata only. It does not expose mutable session state, messages, model internals, or a second execution controller.

## Alternatives considered

1. Reuse a constant component identity — rejected because renderers intentionally keep resolved instances inert.
2. Increment a definition-global counter — rejected because concurrent sessions and replay become order-dependent.
3. Generate a random ID in the callback — rejected because retries and regenerated decisions must be deterministic.

## Consequences

- Repeated component routes remain interactive within one session.
- Deterministic replay preserves the original component identity.
- Direct adapter calls without a user message can fall back to session identity.
- This remains an AgentsKit Chat application-routing concern and does not duplicate an upstream AgentsKit primitive.
