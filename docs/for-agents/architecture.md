---
docbridge:
  relations:
    - from: package:@agentskit/chat
      to: package:@agentskit/chat-protocol
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-angular
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-cli
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-devtools
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-docs
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-ink
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-ink
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-react
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-react
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-react-native
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-react-native
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-shared
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-solid
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-solid
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-svelte
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-svelte
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-vue
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-example-vue
      to: package:@agentskit/chat-example-shared
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-ink
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-react
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-react-native
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-server
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-server
      to: package:@agentskit/chat-protocol
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-solid
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-svelte
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
    - from: package:@agentskit/chat-vue
      to: package:@agentskit/chat
      kind: depends-on
      detection: static
---

# Architecture handoff

## Read first

- Human source: [`../architecture/overview.md`](../architecture/overview.md)
- Accepted decisions: [`../architecture/adrs/`](../architecture/adrs/)
- Upstream-first guardrail: [`../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- Current adoption matrix: [`../architecture/upstream-adoption.md`](../architecture/upstream-adoption.md)
- Product requirements: [`../product/PRD.md`](../product/PRD.md)
- Ecosystem convergence: [`../architecture/adrs/0030-ecosystem-product-chat-convergence.md`](../architecture/adrs/0030-ecosystem-product-chat-convergence.md)
- Controlled host sessions: [`../architecture/adrs/0031-controlled-chat-is-an-application-seam.md`](../architecture/adrs/0031-controlled-chat-is-an-application-seam.md)
- Adoption ledger: [`../dogfood/ecosystem-adoption.md`](../dogfood/ecosystem-adoption.md)

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
