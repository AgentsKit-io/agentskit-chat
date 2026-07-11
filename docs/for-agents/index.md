# AgentsKit Chat agent index

Use this index with `ak-docs query` to locate the owning documentation before changing the repository.

## Ownership

- [Product](./product.md): requirements, user stories, scope, and release outcomes.
- [Architecture](./architecture.md): system boundaries, contracts, modules, protocols, and ADRs.
- [Governance](./governance.md): issue structure, dependencies, Definition of Done, and delivery rules.
- [Chat package](./packages/chat.md): minimal framework-neutral `defineChat` contract.
- [Protocol package](./packages/protocol.md): versioned turn events, compatibility, and conformance fixtures.
- [React package](./packages/react.md): native React shell over `@agentskit/react`.
- [Vue package](./packages/vue.md): native Vue shell over `@agentskit/vue`.
- [Svelte package](./packages/svelte.md): native Svelte 5 shell over `@agentskit/svelte`.
- [Solid package](./packages/solid.md): native Solid shell over `@agentskit/solid`.
- [React Native package](./packages/react-native.md): native mobile shell over `@agentskit/react-native`.
- [Ink package](./packages/ink.md): native terminal shell and semantic text fallback.
- [CLI package](./packages/cli.md): safe project detection and application scaffolding.
- [React example](./apps/example-react.md): deterministic executable proof.
- [React Native example](./apps/example-react-native.md): Expo proof using the shared definition.
- [Ink example](./apps/example-ink.md): PTY proof using the shared definition.
- [Shared example](./apps/example-shared.md): framework-neutral deterministic definition and fixture.

## Invariants

- AgentsKit owns primitives; AgentsKit Chat owns the opinionated application layer.
- Shared definitions and protocol are framework-neutral.
- Renderers are native and consume the corresponding AgentsKit binding.
- React, React Native, and Ink are the first architecture-proof targets.
- Every render frame and action input is runtime validated.
- Missing platform components degrade to declared semantic fallbacks.
