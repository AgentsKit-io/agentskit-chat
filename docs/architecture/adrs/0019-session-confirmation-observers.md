# ADR-0019: Session confirmation observers are isolated

**Status:** Accepted

**Date:** 2026-07-12

## Context

Application audit traces need canonical confirmation records, including tool-call identity and terminal status. Renderers create confirmation coordinators through `ChatSession`, so application definitions previously had no supported observation seam.

## Decision

`createChatSession` accepts an optional `onConfirmationChange` observer. It receives immutable canonical records after session persistence succeeds. Observer failure is isolated and cannot change authorization, confirmation, execution, or persistence outcomes. Durable storage remains the session store's responsibility; audit sinks consume the observer separately.

## Alternatives considered

1. Reconstruct approval from tool execution — rejected because denial, expiry, and canonical correlation are lost.
2. Add renderer-specific callbacks — rejected because behavior would drift across frameworks.
3. Build another confirmation coordinator — rejected because AgentsKit Chat already composes the upstream lifecycle.

## Consequences

- All renderers expose the same application audit seam through prepared sessions.
- Audit failure cannot turn a committed mutation into a retryable tool failure.
- Observers must deduplicate records if they only want status transitions.
