# ADR-0031: Treat externally controlled chat as an application seam

- **Status:** Accepted
- **Date:** 2026-07-14
- **Issue:** [#106](https://github.com/AgentsKit-io/agentskit-chat/issues/106)
- **Parent PRD:** [#99](https://github.com/AgentsKit-io/agentskit-chat/issues/99)

## Context

Some product hosts already own a trusted session transport and receive complete
chat snapshots from another process. Requiring those hosts to instantiate a
second client controller creates two competing lifecycle owners. Copying the
AgentsKit Chat presentation into each host would instead create renderer drift.

The framework needs a controlled mode that accepts host state without becoming
a second controller, transport, persistence layer, or authorization boundary.

## Decision

`@agentskit/chat` exposes a framework-neutral controlled driver. Its input is a
bounded serializable snapshot plus callbacks typed as a `Pick<ChatReturn>` over
the existing AgentsKit lifecycle. The snapshot shell is strict and messages are
validated by `validateMemoryRecord` from `@agentskit/core/memory-validation`
before ISO timestamps are hydrated.

The driver projects the validated state and callbacks into the existing
`ChatReturn` presentation contract. It does not create a controller, consume an
adapter stream, persist messages, or translate lifecycle semantics.

The React shell accepts either its existing definition-owned mode or the
controlled source. Separate acquisition components preserve React hook rules:
the definition-owned component calls upstream `useChat`; the controlled
component never calls it. Both feed one presentation component and reuse the
same component registry, theming, lifecycle controls, and action confirmation
coordinator.

The host remains responsible for authentication, authorization, transport,
persistence, snapshot freshness, and applying every callback result to its
source of truth. Invalid snapshots fail closed before presentation.

## Guardrails

- Do not add a local controller, reducer, adapter stream consumer, or message
  store to the controlled driver.
- Do not mirror the canonical AgentsKit message schema; delegate it upstream.
- Keep host credentials, topology, business rules, and private state out of the
  public snapshot.
- Framework bindings may adapt reactivity but must consume this same driver and
  their existing presentation path.
- A missing reusable primitive must be added and released in AgentsKit before
  downstream integration.

## Consequences

Hosts with server-owned sessions can adopt the shared application shell without
creating a competing runtime. Existing hosts retain the original API and
behavior. Controlled hosts must rerender with a new snapshot after callbacks;
the driver deliberately performs no optimistic state mutation.

## Alternatives considered

1. **Instantiate a hidden controller from the snapshot.** Rejected because the
   host and client would both own lifecycle and persistence.
2. **Create a separate controlled React renderer.** Rejected because component,
   accessibility, theming, and lifecycle presentation would drift.
3. **Accept canonical `Message[]` without runtime validation.** Rejected because
   snapshots cross an external boundary and dates are serialized.
4. **Copy the upstream message schema locally.** Rejected because it would fork
   the AgentsKit contract and create version drift.

## Acceptance

HITL approval to implement the controlled-session slice and its upstream-first
guardrails was recorded on 2026-07-14.

## References

- [ADR-0002: upstream-first and no reimplementation](./0002-upstream-first-no-reimplementation.md)
- [ADR-0030: ecosystem product-chat convergence](./0030-ecosystem-product-chat-convergence.md)
- [Upstream adoption matrix](../upstream-adoption.md)
