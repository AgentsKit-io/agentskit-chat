# ADR-0024: Deterministic answers precede backend adapters

**Status:** Accepted — HITL approved 2026-07-13

**Date:** 2026-07-13

## Context

AgentsKit Docs, Registry, Playbook, and future ecosystem sites need to answer exact questions such as commands, package identities, navigation targets, contribution links, restricted FAQs, and document titles without network latency or model cost. Reasoning, comparisons, recommendations, and other open-ended questions still require the configured backend.

If each host invents matching, confidence, artifact, and escalation rules, the same question can produce incompatible behavior across the ecosystem. If AgentsKit Chat implements another controller, adapter lifecycle, retrieval engine, or message model, it duplicates AgentsKit.

## Decision

`@agentskit/chat-protocol` owns three public v1 runtime boundaries:

- `agentskit.chat.site`: per-site artifact location, expected content hash, and fallback policy;
- `agentskit.chat.knowledge`: immutable local entries containing only declared exact aliases and bounded answers; and
- `agentskit.chat.answer`: answer, choices, or escalation with citations, provenance, suggestions, and confidence.

Artifacts accept only `command`, `package`, `navigation`, `contribution`, `ecosystem`, `restricted-faq`, and `document` entries. Equality uses Unicode NFKC normalization, trimming, collapsed whitespace, and locale-stable case folding. There is no fuzzy, semantic, embedding, prefix, keyword, or model match.

`@agentskit/chat` builds a bounded index once and composes it before a host-supplied AgentsKit `AdapterFactory`:

1. one exact entry returns a high-confidence local answer;
2. multiple exact entries return medium-confidence choices;
3. miss, stale, corrupt, or offline state returns low-confidence escalation; and
4. when a backend exists, the original request, lifecycle, streaming latency, and cancellation remain owned by that adapter. The escalation envelope is added to `AdapterRequest.context.metadata`, while bounded streamed text is observed only to attach the unified backend-answer envelope to the final chunk.

Artifact production, cache policy, fetching, and backend operation remain host responsibilities. The protocol package owns canonical serialization and SHA-256 verification so producers and consumers cannot drift. Doc Bridge may generate artifacts, but AgentsKit Chat does not depend on its implementation. Existing ordered assistant content and standard `source-list`/`choice-list` components project local decisions without a new renderer protocol. Deterministic choices reuse the visible `description` field. The host wires the adapter-owned submission resolver into the chat definition; the session wrapper supplies identity through an optional adapter extension while preserving the upstream request, and the resolver creates an exact, session-scoped reservation that commits after successful send or releases on failure. Generic frames cannot authorize themselves, retries remain functional, and sessions cannot consume each other's choices. Authorization state is bounded per session and globally with claimed reservations protected from eviction; headless hosts can explicitly release abandoned sessions. Headless consumers may resolve an offered entry ID against its original ambiguous query.

## Alternatives considered

1. Ask the backend for every input — rejected because exact local facts need neither network latency nor model work.
2. Add fuzzy or semantic local routing — rejected because uncertainty would be presented as deterministic confidence.
3. Put site artifacts in AgentsKit Core — rejected because ecosystem knowledge and application routing are not provider-neutral chat primitives.
4. Add another controller or stream reducer — rejected by ADR-0002; the published AgentsKit adapter boundary already composes this behavior.
5. Couple the runtime to Doc Bridge — rejected because artifact consumers must remain framework- and generator-neutral.

## Consequences

- Exact ecosystem facts can resolve synchronously and offline.
- Ambiguity is visible instead of silently selecting an answer.
- Unknown or untrusted input never becomes a high-confidence local answer.
- Hosts must cryptographically verify artifacts before constructing the adapter; corrupt programmatic input remains an inert escalation rather than a startup failure.
- `fallback.mode` is enforced by the adapter, even if a backend factory is accidentally supplied while disabled.
- Required fields or semantic changes require v2, compatibility fixtures, and a new ADR.
- The human approval gate in issue #69 was satisfied on 2026-07-13 before this contract was marked ready.

## Upstream adoption record

Inspected public `@agentskit/core@1.12.3` contracts for `AdapterFactory`, `AdapterRequest`, `AdapterContext.metadata`, `StreamSource`, canonical messages, capabilities, and cancellation. The proposal reuses those contracts unchanged. AgentsKit Chat adds only an application artifact schema, conservative exact lookup, response metadata, and projection into its already accepted ordered-content/component protocols. No upstream source or generic primitive is copied.

## Privacy boundary

The proposal uses only public package contracts and synthetic fixtures. It contains no private site content, identifier, policy, source, or production artifact.
