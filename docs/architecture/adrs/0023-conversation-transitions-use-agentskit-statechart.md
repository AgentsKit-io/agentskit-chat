# ADR-0023: Conversation transitions use AgentsKit statechart

**Status:** Accepted

**Date:** 2026-07-13

## Context

ADR-0006 introduced the smallest finite transition implementation needed for deterministic application routes. At that time AgentsKit did not expose a general, framework-neutral interaction-state primitive, so adding another dependency was rejected.

AgentsKit now publishes `@agentskit/statechart@0.2.0`. It owns immutable definitions and instances, definition validation, typed transition results, and host-supplied identity and time. Keeping equivalent validation and transition assignment in AgentsKit Chat would violate ADR-0002 and split generic fixes between repositories.

AgentsKit Chat still owns application routes, route precedence, adapter fallback, trace projection, retained deterministic decisions, session persistence, and the projection of application actions. Those concerns coordinate a chat application and do not belong to the reusable statechart package.

## Decision

`@agentskit/chat` consumes the published `@agentskit/statechart` package.

For each `ConversationDefinition`, `createChatSession` compiles the declared states and event targets into an upstream `StatechartDefinition`. It creates one immutable upstream instance per application session and advances or rebuilds that instance only through `transitionStatechart`.

The public `ConversationDefinition`, `ConversationSnapshot`, `ChatSession`, and session wire envelope remain unchanged. State actions remain application metadata projected from the active state. Route declarations remain local because they match user input, produce application responses, and decide when to delegate to the AgentsKit chat adapter.

AgentsKit Chat validates only its application-specific route constraints: route identity, route precedence, optional state restrictions, and references from routes to declared states. Generic initial-state and transition-target validation is delegated upstream. Upstream diagnostics are mapped to the existing public `ConfigError` boundary.

Session persistence continues to store application decisions and the current application state, not an additional upstream snapshot. On resume and history repair, retained route decisions are replayed through the upstream statechart so persisted metadata cannot bypass its transition contract.

## Alternatives considered

1. Keep the local finite transition implementation — rejected because it duplicates a now-published AgentsKit primitive.
2. Expose `StatechartDefinition` directly from `ChatDefinition` — rejected because route composition and application actions would leak into a lower-level contract and break the existing public API.
3. Persist a second statechart snapshot beside the application session — rejected because it would create two authorities for the same conversation progress.
4. Import unpublished source or a workspace path — rejected by ADR-0002; only the supported npm release is an integration boundary.

## Consequences

- AgentsKit is the single source of truth for reusable transition validation and execution.
- Existing Chat definitions, renderers, and stored v1 session envelopes remain compatible.
- A session rebuild performs small synchronous statechart transitions for retained deterministic decisions.
- Statechart breaking changes require an upstream release and a downstream compatibility review.

## Upstream adoption record

- Inspected public exports: `defineStatechart`, `createStatechartInstance`, `transitionStatechart`, `StatechartDefinition`, `StatechartEvent`, immutable instances, and typed diagnostics.
- Reused upstream behavior: definition validation, immutable session state, and accepted/rejected transition execution.
- Local behavior: deterministic route matching, adapter composition, application traces/actions, decision replay, and session persistence.
- Upstream delivery: [AgentsKit #1199](https://github.com/AgentsKit-io/agentskit/issues/1199), [PR #1210](https://github.com/AgentsKit-io/agentskit/pull/1210), and `@agentskit/statechart@0.2.0`.
- No upstream or private source is copied or reimplemented.

## Privacy boundary

This decision is derived exclusively from public AgentsKit contracts and synthetic Chat tests. It contains no private source, identifier, schema, fixture, product policy, or business rule.
