# Architecture handoff

## Read first

- Human source: [`../architecture/overview.md`](../architecture/overview.md)
- Accepted decisions: [`../architecture/adrs/`](../architecture/adrs/)
- Upstream-first guardrail: [`../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- Product requirements: [`../product/PRD.md`](../product/PRD.md)

## Change route

Use this ownership area for the universal chat definition, turn protocol, deterministic engine, action policy, session boundary, native renderer contract, theming contract, CLI architecture, and compatibility strategy.

Do not place JSX, DOM types, React hooks, Vue reactivity, Svelte stores, Angular signals, React Native primitives, or Ink components in shared contracts.

Before adding a primitive, inspect AgentsKit source and public exports. Reuse or compose the upstream API. If a generally useful primitive is missing, link and complete the upstream AgentsKit change before implementing the application-layer integration here.

## Required evidence

- Runtime schemas for external and model-produced data.
- Contract fixtures shared by every renderer.
- Compatibility policy for versioned events.
- ADR for new public architectural decisions.
- Upstream-adoption record proving no AgentsKit primitive was copied or reimplemented.
