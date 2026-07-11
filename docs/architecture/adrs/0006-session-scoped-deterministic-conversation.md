# ADR-0006: Session-scoped deterministic conversation

**Status:** Accepted

**Date:** 2026-07-11

## Context

Known application workflows must execute without model interpretation, while unresolved input must retain the complete AgentsKit chat lifecycle. Conversation progress cannot live on a shared `ChatDefinition`, because the same definition may mount in multiple users, renderers, or tests.

## Decision

`createChatSession(definition)` creates a fresh application session and derives an upstream `ChatConfig` by wrapping only its `AdapterFactory`.

Routes are evaluated in declaration order. A route is eligible only when its state restriction matches and its event is a declared transition from the current state. A match emits an upstream-compatible deterministic `StreamSource`, commits the declared transition, and records its turn classification. A miss delegates the unchanged request to the original adapter and records an `agentic` turn.

Conversation state, allowed events, and allowed actions are projected from the active state. The trace taxonomy is `deterministic`, `agentic`, `repaired`, and `fallback`; traces contain decision metadata, never prompt content.

Deterministic decisions are cached by user-message identity and input. Retry and regenerate replay the same decision without model dispatch; a subsequent dispatch rebuilds conversation state from the retained user-message history before resolving an edited turn and prunes removed decisions. History mutations that do not dispatch a turn do not themselves transition the application machine. Route callback failures return an upstream error stream without committing a transition. Trace observers are best-effort and cannot affect dispatch.

Every renderer compiles one session-scoped config per definition mount and continues to use its official AgentsKit binding.

## Alternatives considered

1. A second chat controller — rejected because AgentsKit owns lifecycle, streaming, tools, memory, and cancellation.
2. Route matching inside each renderer — rejected because behavior would drift across platforms.
3. Mutable state on `ChatDefinition` — rejected because concurrent mounts would share conversation progress.
4. A general statechart dependency — rejected because explicit transition records satisfy the current finite workflow without another runtime.

## Consequences

- Known commands bypass model dispatch without bypassing the upstream controller.
- Each mount receives isolated conversation progress.
- Retry and regenerate remain deterministic; edited/truncated history is reconciled on its next dispatch.
- Same-id `ChatConfig` updates reach the upstream binding without resetting conversation progress.
- Route handlers cannot choose arbitrary target states; the machine owns transitions.
- Persistence, async routing, protocol transport, and action execution remain separate future concerns.
