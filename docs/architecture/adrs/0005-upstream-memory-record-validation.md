# ADR-0005: Upstream memory-record validation

**Status:** Accepted

**Date:** 2026-07-11

## Context

The snapshot envelope needs runtime validation for serialized AgentsKit messages. Recreating message, content-part, tool-call, metadata, or memory schemas in this repository would duplicate canonical AgentsKit contracts and allow the framework to drift from its foundation.

## Decision

`@agentskit/chat-protocol` delegates canonical message-record validation to the published `@agentskit/core/memory-validation` subpath. The protocol package owns only its application envelope, lifecycle fields, diagnostics, and compatibility policy.

If the upstream validator cannot express a required canonical record, change and release AgentsKit first. Do not add a parallel validator, type assertion, compatibility cast, or local copy of the upstream schema.

## Consequences

- AgentsKit remains the single source of truth for message records.
- The framework receives upstream validation fixes through a dependency update.
- Protocol tests must prove that hostile, cyclic, deep, and non-JSON records fail inertly.
- A protocol release may wait for an upstream AgentsKit patch when a canonical contract is missing.
