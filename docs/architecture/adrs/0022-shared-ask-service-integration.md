# ADR-0022: Ask service integration is shared application infrastructure

**Status:** Accepted

**Date:** 2026-07-13

## Context

AgentsKit Docs, Registry, and Playbook consume the same Ask NDJSON service. Their first dogfood implementations independently repeated the event schema, stream decoder, message projection, citation safety, connection deadline, cancellation, and browser-session migration. That drift already produced a whole-stream timeout in two hosts and storage behavior that differed from the canonical AgentsKit memory contract.

The Ask wire protocol is application-specific, so it does not belong in AgentsKit Core. Browser message persistence is generic and already belongs to AgentsKit Memory.

## Decision

`@agentskit/chat-protocol` owns the versioned, bounded Ask event schema and NDJSON decoder. `@agentskit/chat` owns one public integration composed of:

- an `AdapterFactory` that maps Ask events into the ordered assistant-content protocol;
- safe `cite` projection into the standard `source-list` component;
- a validated callback for host-specific presentation tools;
- a connection-only deadline, upstream stream cancellation, and plain-text fallback;
- wire projection from canonical AgentsKit messages; and
- legacy Ask-session migration composed over `createWebStorageMemory` from `@agentskit/memory@0.11.0`.

Hosts configure only endpoint, corpus/persona, canonical and legacy storage keys, and an optional native application-tool projector. They must not own another Ask schema, decoder, fetch loop, citation projector, or message store.

The connection deadline is cleared as soon as response headers arrive. A healthy long-running response body remains governed by user cancellation rather than an arbitrary whole-stream timer.

## Alternatives considered

1. Keep one adapter in every host — rejected because the three implementations had already diverged in timeout, validation, and persistence behavior.
2. Put Ask in AgentsKit Core — rejected because Ask is a product/application protocol, not a provider-neutral chat primitive.
3. Add another browser memory implementation here — rejected by ADR-0002; the generic gap was fixed in AgentsKit #1191/#1192 and released as `@agentskit/memory@0.11.0` first.
4. Hard-code Docs generative tools in the shared adapter — rejected because those components are host presentation policy. A validated projector preserves the generic boundary.

## Consequences

- Docs, Registry, and Playbook consume one published implementation and can vary only at explicit configuration and presentation seams.
- Unknown, malformed, oversized, and unsafe records stay inert.
- Canonical messages, controller lifecycle, persistence contract, and cancellation remain owned by AgentsKit.
- Changes to the Ask service contract require conformance tests and a new immutable artifact before host adoption.

## Upstream adoption

AgentsKit Core continues to own `AdapterFactory`, `StreamSource`, `Message`, ordered controller reduction, and `ChatMemory`. AgentsKit Memory owns validated Web Storage persistence. AgentsKit Chat Protocol owns versioned wire validation; AgentsKit Chat adds only the Ask integration and projection required by its dogfood hosts. No generic upstream primitive is copied.
