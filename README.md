# AgentsKit Chat

External dogfood hosts use the immutable [alpha artifact channel](./docs/releases/alpha-dogfood.md). The stable v0 publication remains gated by the roadmap's dogfood and conformance milestones.

Cross-framework application framework for building interactive agent experiences on top of [AgentsKit](https://github.com/AgentsKit-io/agentskit).

The project is currently in its architecture and planning phase. Its goal is to let teams define agent behavior once and deliver native chat experiences across React, Vue, Svelte, Solid, Angular, React Native, and Ink.

## Product promise

**One agent experience. Every interface.**

AgentsKit Chat will provide an opinionated layer for:

- typed chat definitions;
- deterministic routes and conversational state machines;
- schema-backed interactive components;
- typed actions with policy and human confirmation;
- sessions, streaming, persistence, replay, and evaluation;
- semantic theming and native renderers for every AgentsKit UI binding;
- a framework-aware `init` command.

AgentsKit remains the substrate for adapters, models, tools, memory, RAG, runtime, and framework bindings. AgentsKit Chat composes those primitives into full interactive applications.

## Documentation

- [Product requirements](./docs/product/PRD.md)
- [Implementation roadmap](./docs/product/roadmap.md)
- [Architecture overview](./docs/architecture/overview.md)
- [ADR-0001: cross-framework core and native renderers](./docs/architecture/adrs/0001-cross-framework-core.md)
- [AgentsKit upstream adoption matrix](./docs/architecture/upstream-adoption.md)
- [ADR-0002: upstream-first and no reimplementation](./docs/architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [Deterministic answer protocol](./docs/protocol/deterministic-answers.md)
- [Agent documentation index](./docs/for-agents/index.md)

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
