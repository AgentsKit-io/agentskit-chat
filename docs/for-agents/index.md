# AgentsKit Chat agent index

Use this index with `ak-docs query` to locate the owning documentation before changing the repository.

## Ownership

- [Product](./product.md): requirements, user stories, scope, and release outcomes.
- [Architecture](./architecture.md): system boundaries, contracts, modules, protocols, and ADRs.
- [Governance](./governance.md): issue structure, dependencies, Definition of Done, and delivery rules.
- [Stable release](./release.md): fixed package graph, provenance, compatibility, and HITL publication.
- [Registry/Playbook dogfood](../dogfood/registry-playbook.md): live-host ownership correction, migration boundary, and parity evidence.
- [Fumadocs framework dogfood](./apps/docs.md): canonical docs portal, deterministic public knowledge, and hosted/self-hosted Ask seam.
- [Chat package](./packages/chat.md): minimal framework-neutral `defineChat` contract.
- [Protocol package](./packages/protocol.md): versioned turn events, compatibility, and conformance fixtures.
- [Trusted Ask backend](../backend.md): hosted/self-hosted site policy, cited retrieval, persistence, and metrics.
- [React package](./packages/react.md): native React shell over `@agentskit/react`.
- [Vue package](./packages/vue.md): native Vue shell over `@agentskit/vue`.
- [Angular package](./packages/angular.md): standalone Angular shell over `@agentskit/angular`.
- [Svelte package](./packages/svelte.md): native Svelte 5 shell over `@agentskit/svelte`.
- [Solid package](./packages/solid.md): native Solid shell over `@agentskit/solid`.
- [React Native package](./packages/react-native.md): native mobile shell over `@agentskit/react-native`.
- [Ink package](./packages/ink.md): native terminal shell and semantic text fallback.
- [CLI package](./packages/cli.md): safe project detection and application scaffolding.
- [React example](./apps/example-react.md): deterministic executable proof.
- [Vue example](./apps/example-vue.md): DOM parity host over the shared definition.
- [Svelte example](./apps/example-svelte.md): Svelte 5 DOM parity host over the shared definition.
- [Solid example](./apps/example-solid.md): Solid DOM parity host over the shared definition.
- [React Native example](./apps/example-react-native.md): Expo proof using the shared definition.
- [Ink example](./apps/example-ink.md): PTY proof using the shared definition.
- [Shared example](./apps/example-shared.md): framework-neutral deterministic definition and fixture.

## Invariants

- AgentsKit owns primitives; AgentsKit Chat owns the opinionated application layer.
- Shared definitions and protocol are framework-neutral.
- Renderers are native and consume the corresponding AgentsKit binding.
- React, React Native, and Ink remain the original architecture-proof targets; Vue, Svelte, and Solid now host the same shared references in `apps/`.
- Every render frame and action input is runtime validated.
- Missing platform components degrade to declared semantic fallbacks.
