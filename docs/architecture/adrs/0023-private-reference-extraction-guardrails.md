# ADR-0023: Private references inform requirements, not public implementation records

**Status:** Proposed

**Date:** 2026-07-13

## Context

AgentsKit Chat is dogfooded by both public and private consumers. A mature private consumer can reveal missing framework capabilities, but publishing a source-linked inventory or internal behavior would disclose confidential implementation and couple the public design to one product's business logic.

The public framework still needs an auditable way to learn from private use without copying source, reconstructing private architecture, or turning product-specific behavior into generic contracts.

## Decision

Private consumers are reviewed only as black-box evidence. Public artifacts may contain independently specified generic requirements, public API gap analysis, ownership decisions, synthetic examples, and public conformance criteria.

Public artifacts must not contain private identifiers, repository paths, symbols, source excerpts, schemas, prompts, flows, states, catalogs, policies, business rules, integrations, data shapes, topology, screenshots, logs, or derived fixtures.

Work proceeds through these gates:

1. Convert private observations into generic requirements in a non-public review context.
2. Remove private names and implementation details before public issue or ADR creation.
3. Compare only the generic requirement with published AgentsKit and AgentsKit Chat APIs.
4. Fix generally reusable gaps in AgentsKit first; add only application-layer composition in Chat.
5. Build synthetic public fixtures that do not derive from private data or logic.
6. Require privacy review of the diff and reachable Git history before publication.
7. Adopt public capabilities in consumers only after contract, compatibility, and rollback review.

No private repository is a source dependency, code donor, public specification, or fixture corpus.

## Consequences

### Positive

- Private product behavior and business logic remain confidential.
- Public contracts are independently understandable and reusable.
- Upstream-first ownership remains enforceable.
- Synthetic fixtures prove behavior without leaking consumer details.

### Negative

- Public design records contain less provenance detail.
- Maintainers need a separate confidential evidence trail when deeper traceability is required.
- Privacy review and history inspection add a release gate.

### Neutral

- A capability may resemble behavior used by a private consumer, but its public specification must stand on its own.
- Consumer migrations remain separately reviewed and are not documented as framework internals.

## Alternatives considered

### Publish a source-linked private capability inventory

Rejected because paths, symbols, and behavior can disclose architecture and business logic even without copying code.

### Copy private generic-looking modules and sanitize later

Rejected because provenance, hidden assumptions, and Git history still create disclosure and ownership risk.

### Ignore private dogfood evidence

Rejected because black-box requirements can improve the public framework safely when independently specified.

## Security and privacy constraints

- Public Git history is part of the disclosure surface, not only the final diff.
- Deleted public text is treated as disclosed until the reachable branch history is rewritten or removed.
- Public fixtures use invented domains, identifiers, values, and flows.
- Host authorization, data, policy, integrations, and execution authority never move into the framework.
- Reviewers stop publication when a generic requirement cannot be explained without private implementation details.

## Review and acceptance

This ADR remains **Proposed** until a human privacy and architecture review accepts the boundary and confirms the public branch contains no private implementation disclosure.

## References

- [ADR-0002: Upstream-first and no reimplementation](./0002-upstream-first-no-reimplementation.md)
- [Private-reference extraction guardrails](../private-reference-extraction.md)
- [Public capability gap matrix](../public-capability-gap-matrix.md)
- [Issue #28](https://github.com/AgentsKit-io/agentskit-chat/issues/28)
