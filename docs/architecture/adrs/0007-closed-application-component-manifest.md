# ADR-0007: Closed application component manifest

**Status:** Accepted

**Date:** 2026-07-11

## Context

AgentsKit owns the portable standard `UIElement` union and its validator. Applications also need custom semantic components whose model-produced props are untrusted and whose native implementations differ across React, React Native, and Ink.

Extending or copying the upstream union would create a competing generative-UI protocol. Letting renderers accept arbitrary component names or unchecked props would make model output executable UI configuration.

## Decision

`@agentskit/chat` owns a closed application component manifest. Each entry has a stable key and a Zod props schema. A component render frame is usable only when its v1 envelope is valid, its key is registered, and its props pass that registered schema. Otherwise resolution is inert and returns a typed, non-retryable diagnostic.

`@agentskit/chat-protocol` owns the framework-neutral render frame, semantic selection event, safe decoder, shared fixtures, and the wire schema for the semantic fallback established by ADR-0003. `@agentskit/chat` delegates its existing fallback parser to that schema and retains its public formatting API. This supersedes ADR-0003 only where it originally assigned schema ownership to `@agentskit/chat`; it avoids defining the same boundary twice. Native renderer packages own presentation and interaction mechanics only; they emit the same validated event.

`ChoiceList` is the first registered application component. Its props contain a prompt and 1–20 uniquely identified choices. Selection can reference only an id in the validated frame.

## Consequences

- AgentsKit remains the sole owner of standard generative UI, controller lifecycle, and framework bindings.
- Unknown keys and invalid frames or props cannot call application callbacks.
- React, React Native, Ink, and future renderers share identity, props, fallback, and event semantics without sharing UI primitives.
- Adding a component is an explicit registry and documentation change; changing required v1 semantics requires a new protocol version and ADR.
