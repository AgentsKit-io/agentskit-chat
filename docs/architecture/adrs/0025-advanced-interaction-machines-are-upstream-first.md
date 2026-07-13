# ADR-0025: Advanced interaction machines are upstream-first

**Status:** Proposed

**Date:** 2026-07-13

## Context

ADR-0006 intentionally provides lightweight finite conversation transitions. Public advanced-chat requirements add an optional class of deterministic interaction that can pause, serialize, restore, validate transitions, and replay without replacing chat lifecycle or executing product work.

AgentsKit Runtime flow/durable APIs execute work. Core `ChatController` owns messages, model calls, and tools. A pure interaction-state primitive has a separate responsibility and can be useful to chat applications, CLI wizards, approval experiences, and skills.

Under ADR-0002, the generally reusable primitive must be released by AgentsKit before AgentsKit Chat consumes it.

## Decision

Advanced persisted interaction machines are blocked on [AgentsKit #1199](https://github.com/AgentsKit-io/agentskit/issues/1199).

The upstream primitive owns only immutable definitions, explicit transitions, deterministic accepted/rejected results, versioned serialization, runtime-validated restore, deterministic test seams, and optional observers outside the pure transition core.

It does not own model calls, messages, tools, execution, confirmation, authorization, storage backends, rendering, product phases, business policy, or side effects.

After a supported release, AgentsKit Chat may compose machine snapshots with versioned session metadata, restrict public routes/intents by active state, project allowed events, restore compatible snapshots, and emit bounded traces.

The existing lightweight conversation API remains supported. Advanced machines are additive and optional.

## Consequences

### Positive

- One reusable primitive serves the public ecosystem.
- Chat lifecycle, work execution, and interaction state retain distinct owners.
- Simple chats keep a small API and bundle footprint.
- Invalid or incompatible restored state can fail closed consistently.

### Negative

- Advanced Chat support blocks on upstream design, implementation, and release.
- Versioned state migration adds compatibility and test cost.
- Chat needs a documented seam between lightweight and advanced interactions.

### Neutral

- Package location depends on upstream bundle and ownership review.
- Consumer-specific machine definitions remain host-owned.

## Alternatives considered

### Expand Chat conversation state locally

Rejected because serialization and deterministic restore are generally useful beyond Chat.

### Use Runtime flow/durable

Rejected because those APIs execute work rather than represent pure user-interaction state.

### Adopt a full statechart runtime immediately

Rejected because its breadth and bundle cost exceed the proven public minimum contract.

## Security and failure constraints

- Restored state and context are untrusted and runtime validated.
- Unknown versions, states, and events fail closed with typed diagnostics.
- Transitions perform no I/O and grant no capabilities.
- Side effects remain in trusted host code after policy checks.
- Replay cannot re-execute host actions.

## Review and acceptance

This ADR remains **Proposed** until the upstream boundary is accepted and a supported release exists.

## References

- [ADR-0002](./0002-upstream-first-no-reimplementation.md)
- [ADR-0006](./0006-session-scoped-deterministic-conversation.md)
- [ADR-0011](./0011-application-session-metadata-over-chat-memory.md)
- [ADR-0023](./0023-private-reference-extraction-guardrails.md)
- [AgentsKit #1199](https://github.com/AgentsKit-io/agentskit/issues/1199)
