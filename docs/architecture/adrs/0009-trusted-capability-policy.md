# ADR-0009: Trusted capability policy composes upstream authorization

**Status:** Accepted

**Date:** 2026-07-11

## Context

Confirmation proves user intent, not authority. Capability claims embedded in messages, component props, or tool arguments are untrusted. Policy must apply equally to model-originated and deterministic application actions without wrapping the AgentsKit executor.

## Decision

`createCapabilityPolicy` resolves context from a host-owned callback on every proposal and execution check. It default-denies missing context, session mismatch, unregistered actions, and missing capabilities. Requirements explicitly list every allowed action; an empty list is an explicit public action.

`withActionPolicy` composes this decision with any existing AgentsKit authorizer. It delegates enforcement to the released `ChatConfig.authorizeToolCall` contract from `@agentskit/core@1.12.0`.

Every application decision creates an immutable, replayable trace containing action, canonical tool-call id, phase, required capabilities, decision, reason, and timestamp. Trusted context and tool arguments are deliberately excluded. Trace observers are isolated from enforcement.

## Consequences

- Messages cannot grant capabilities or select a trusted session.
- Capability revocation is observed at execution time.
- The framework ships no RBAC engine, network policy service, or executor wrapper.
- Durable audit storage and identity-provider adapters remain host/server responsibilities.

## Upstream adoption

- Upstream issue: [AgentsKit #1147](https://github.com/AgentsKit-io/agentskit/issues/1147).
- Released implementation: [AgentsKit PR #1148](https://github.com/AgentsKit-io/agentskit/pull/1148), `@agentskit/core@1.12.0`.
- Reused: canonical tool registry, proposal lifecycle, execution-time authorization, typed errors, confirmation, and framework bindings.

