# AgentsKit Chat

[![CI](https://github.com/AgentsKit-io/agentskit-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/AgentsKit-io/agentskit-chat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@agentskit/chat?label=%40agentskit%2Fchat)](https://www.npmjs.com/package/@agentskit/chat)
[![doc-bridge](https://img.shields.io/npm/v/@agentskit/doc-bridge?label=doc--bridge)](https://www.npmjs.com/package/@agentskit/doc-bridge)

Cross-framework application framework for building interactive agent experiences on top of [AgentsKit](https://github.com/AgentsKit-io/agentskit).

Version `0.2.0` lets teams define agent behavior once and deliver native chat
experiences across React, React Native, Ink, Vue, Svelte, Solid, and Angular.
AgentsKit remains the controller/runtime substrate; this repository adds the
opinionated application framework around it.

> **Distribution status:** all twelve public packages are available from npm at
> `0.2.0` with provenance. See the [launch checklist](./docs/releases/launch-checklist.md)
> for the remaining release-operations work.

```bash
pnpm dlx @agentskit/chat-cli@0.2.0 init my-chat --renderer react --yes
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
- [Deployment modes](./docs/deployment.md) (Next, Hono, Express, Cloudflare Worker recipes)
- [Hosted and self-hosted Ask backend](./docs/backend.md)
- [DOM renderer parity examples](./docs/examples/dom-renderer-parity.md)
- [Positioning vs adjacent tools](./docs/product/positioning.md)
- [Compatibility matrix](./docs/releases/compatibility.md)
- [Stability and upgrades](./docs/releases/stability.md)
- [Launch checklist](./docs/releases/launch-checklist.md)
- [Security policy](./SECURITY.md)
- [v0.2.0 release notes](./docs/releases/v0.2.0.md)
- [Contributing](./CONTRIBUTING.md)
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

## Examples

```bash
pnpm --filter @agentskit/chat-example-react dev
pnpm --filter @agentskit/chat-example-vue dev
pnpm --filter @agentskit/chat-example-svelte dev
pnpm --filter @agentskit/chat-example-solid dev
```

React, Vue, Svelte, and Solid host the same definitions from
`@agentskit/chat-example-shared`. React Native and Ink keep dedicated proof apps.

## Doc bridge

```bash
pnpm install
pnpm docs:bridge:index
pnpm docs:bridge:query ownership architecture --agent
pnpm docs:bridge:gate
pnpm docs:bridge:doctor
```

Optional Layer 1 (Ollama + AgentsKit peers; not required for CI):

```bash
pnpm docs:bridge:rag:ingest
pnpm docs:bridge:ask "Who owns the Vue renderer?"
pnpm docs:bridge:chat
```

The generated index, `llms.txt`, capabilities manifest, CLI queries, MCP tools,
and opt-in intelligence/memory pipeline come from
[`@agentskit/doc-bridge`](https://www.npmjs.com/package/@agentskit/doc-bridge).

## License

[MIT](./LICENSE)
