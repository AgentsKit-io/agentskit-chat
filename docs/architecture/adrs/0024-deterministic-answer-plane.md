# ADR-0024: Deterministic answers precede backend adapters

**Status:** Proposed — requires human approval before merge

**Date:** 2026-07-13

## Context

AgentsKit Docs, Registry, Playbook, and future ecosystem sites need to answer exact questions such as commands, package identities, navigation targets, contribution links, restricted FAQs, and document titles without network latency or model cost. Reasoning, comparisons, recommendations, and other open-ended questions still require the configured backend.

If each host invents matching, confidence, artifact, and escalation rules, the same question can produce incompatible behavior across the ecosystem. If AgentsKit Chat implements another controller, adapter lifecycle, retrieval engine, or message model, it duplicates AgentsKit.

## Proposed decision

`@agentskit/chat-protocol` owns three public v1 runtime boundaries:

- `agentskit.chat.site`: per-site artifact location, expected content hash, and fallback policy;
- `agentskit.chat.knowledge`: immutable local entries containing only declared exact aliases and bounded answers; and
- `agentskit.chat.answer`: answer, choices, or escalation with citations, provenance, suggestions, and confidence.

Artifacts accept only `command`, `package`, `navigation`, `contribution`, `ecosystem`, `restricted-faq`, and `document` entries. Equality uses Unicode NFKC normalization, trimming, collapsed whitespace, and locale-stable case folding. There is no fuzzy, semantic, embedding, prefix, keyword, or model match.

`@agentskit/chat` builds a bounded index once and composes it before a host-supplied AgentsKit `AdapterFactory`:

1. one exact entry returns a high-confidence local answer;
2. multiple exact entries return medium-confidence choices;
3. miss, stale, corrupt, or offline state returns low-confidence escalation; and
4. when a backend exists, the original request, lifecycle, stream, and cancellation remain owned by that adapter. The escalation envelope is added only to `AdapterRequest.context.metadata`.

Artifact production, cache policy, fetching, content hashing, and backend operation remain host responsibilities. Doc Bridge may generate artifacts, but AgentsKit Chat does not depend on its implementation. Existing ordered assistant content and standard `source-list`/`choice-list` components project local decisions without a new renderer protocol.

## Alternatives considered

1. Ask the backend for every input — rejected because exact local facts need neither network latency nor model work.
2. Add fuzzy or semantic local routing — rejected because uncertainty would be presented as deterministic confidence.
3. Put site artifacts in AgentsKit Core — rejected because ecosystem knowledge and application routing are not provider-neutral chat primitives.
4. Add another controller or stream reducer — rejected by ADR-0002; the published AgentsKit adapter boundary already composes this behavior.
5. Couple the runtime to Doc Bridge — rejected because artifact consumers must remain framework- and generator-neutral.

## Proposed consequences

- Exact ecosystem facts can resolve synchronously and offline.
- Ambiguity is visible instead of silently selecting an answer.
- Unknown or untrusted input never becomes a high-confidence local answer.
- Hosts must decode and hash-check artifacts before constructing the adapter.
- Required fields or semantic changes require v2, compatibility fixtures, and a new ADR.
- This ADR and its public contract must not be merged until the human approval gate in issue #69 is satisfied.

## Upstream adoption record

Inspected public `@agentskit/core@1.12.3` contracts for `AdapterFactory`, `AdapterRequest`, `AdapterContext.metadata`, `StreamSource`, canonical messages, capabilities, and cancellation. The proposal reuses those contracts unchanged. AgentsKit Chat adds only an application artifact schema, conservative exact lookup, response metadata, and projection into its already accepted ordered-content/component protocols. No upstream source or generic primitive is copied.

## Privacy boundary

The proposal uses only public package contracts and synthetic fixtures. It contains no private site content, identifier, policy, source, or production artifact.
