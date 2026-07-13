# AgentsKit Chat

Cross-framework application framework for building interactive agent experiences on top of [AgentsKit](https://github.com/AgentsKit-io/agentskit).

Version `0.1.0` lets teams define agent behavior once and deliver native chat
experiences across React, React Native, Ink, Vue, Svelte, Solid, and Angular.
AgentsKit remains the controller/runtime substrate; this repository adds the
opinionated application framework around it.

```bash
pnpm dlx @agentskit/chat-cli@0.1.0 init my-chat --renderer react --yes
```

## Product promise

**One agent experience. Every interface.**

AgentsKit Chat provides an opinionated layer for:

- typed chat definitions;
- deterministic routes and conversational state machines;
- schema-backed interactive components;
- typed actions with policy and human confirmation;
- sessions, streaming, persistence, replay, and evaluation;
- semantic theming and native renderers for every AgentsKit UI binding;
- a framework-aware `init` command.

AgentsKit remains the substrate for adapters, models, tools, memory, RAG, runtime, and framework bindings. AgentsKit Chat composes those primitives into full interactive applications.

## Documentation

- [Get started in all seven renderers](./docs/getting-started/README.md)
- [API reference](./docs/api-reference.md)
- [Deployment modes](./docs/deployment.md)
- [Hosted and self-hosted Ask backend](./docs/backend.md)
- [Compatibility matrix](./docs/releases/compatibility.md)
- [Stability and upgrades](./docs/releases/stability.md)
- [Security policy](./SECURITY.md)
- [v0.1.0 release notes](./docs/releases/v0.1.0.md)
- [Product requirements](./docs/product/PRD.md)
- [Implementation roadmap](./docs/product/roadmap.md)
- [Architecture overview](./docs/architecture/overview.md)
- [ADR-0001: cross-framework core and native renderers](./docs/architecture/adrs/0001-cross-framework-core.md)
- [AgentsKit upstream adoption matrix](./docs/architecture/upstream-adoption.md)
- [ADR-0002: upstream-first and no reimplementation](./docs/architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [Deterministic answer protocol](./docs/protocol/deterministic-answers.md)
- [Trusted Ask backend ADR](./docs/architecture/adrs/0026-trusted-ask-backend-vertical.md)
- [Agent documentation index](./docs/for-agents/index.md)

Existing external dogfood lockfiles may continue using the immutable
[alpha artifact channel](./docs/releases/alpha-dogfood.md). New installations
should use the stable npm package graph.

## Doc bridge

```bash
pnpm install
pnpm docs:bridge:index
pnpm docs:bridge:query ownership architecture --agent
pnpm docs:bridge:gate
```

The generated index, `llms.txt`, capabilities manifest, CLI queries, and MCP tools all come from [`@agentskit/doc-bridge`](https://www.npmjs.com/package/@agentskit/doc-bridge).

## License

[MIT](./LICENSE)
