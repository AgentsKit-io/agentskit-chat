# Public advanced-chat capability gap matrix

**Status:** Draft for human review in [#28](https://github.com/AgentsKit-io/agentskit-chat/issues/28)

**Inspected:** 2026-07-13 against published AgentsKit packages and the public AgentsKit Chat repository.

## Dispositions

| Disposition | Meaning |
|---|---|
| Reuse | A released AgentsKit or AgentsKit Chat API already owns the mechanism. |
| Compose in Chat | The behavior belongs to the cross-framework application layer. |
| Upstream first | The mechanism is generally reusable and must be released by AgentsKit before Chat consumes it. |
| Host-owned | Product data, authority, policy, and business behavior remain with the consumer. |

## Matrix

| Public requirement | Existing public foundation | Disposition | Next decision |
|---|---|---|---|
| Versioned structured application turns | Core messages/tool calls; Chat protocol content records and component frames. | Reuse + compose in Chat | Define the application-turn schema and compatibility path without duplicating Core types. |
| Bounded structured-output repair | Core `ChatController` validated tool-error feedback and bounded tool iterations. | Reuse + compose in Chat | Use one internal submit-turn tool; do not run another model loop. |
| Deterministic application behavior | Chat session routes and trace taxonomy. | Compose in Chat | Add public evidence/conflict diagnostics through synthetic fixtures. |
| Serializable interaction state | Lightweight Chat transitions; Runtime flow/durable execution. | Upstream first | Track the pure state primitive in [AgentsKit #1199](https://github.com/AgentsKit-io/agentskit/issues/1199). |
| Bounded host context | Trusted server/session seams and stable route identity. | Compose in Chat | Define a versioned, redacted envelope populated by the host. |
| Registered UI and semantic fallback | Closed manifests, runtime schemas, standard catalog, and native renderers. | Reuse + compose in Chat | Extend only public semantic metadata and conformance fixtures. |
| Typed action proposals | Core authorization/confirmation/execution; Chat capability policy. | Reuse + compose in Chat | Map presentation intent to canonical Core proposal APIs. |
| Product authorization and execution | Core and Chat expose enforcement seams. | Host-owned | The framework never ships consumer business policy or an alternate executor. |
| Grounding/evidence projection | AgentsKit retrieval; Chat cited-source projection and traces. | Reuse + compose in Chat | Add optional public evidence metadata without implementing retrieval. |
| Replay and confidence assertions | AgentsKit Eval replay; Chat application traces and renderer conformance. | Reuse + compose in Chat | Add public turn-level scorers around upstream replay. |
| Offline and degraded behavior | Deterministic routes, memory, replay, and semantic fallbacks. | Reuse + compose in Chat | Add public capability and failure fixtures; network policy remains host-owned. |

## Confirmed upstream gap

A small serializable interaction-state primitive is not currently exposed by AgentsKit. It must remain pure and separate from Core chat lifecycle and Runtime work execution. The public proposal is tracked in [AgentsKit #1199](https://github.com/AgentsKit-io/agentskit/issues/1199) and [ADR-0025](./adrs/0025-advanced-interaction-machines-are-upstream-first.md).

## No upstream gap for structured turns

Core already owns the conversational tool loop, validation feedback, iteration budget, cancellation, memory, authorization, and observers. [ADR-0024](./adrs/0024-structured-turns-use-canonical-tool-loop.md) proposes application-layer composition over that public behavior.

## Implementation gate

No consumer migration begins from this matrix. Public contracts require human approval, synthetic fixtures, supported upstream releases where needed, and a privacy review of the complete reachable branch history.
