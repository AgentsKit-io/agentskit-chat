# Contributing to AgentsKit Chat

Thanks for helping improve AgentsKit Chat. This repository is the
cross-framework **application** layer on top of AgentsKit. Read
[AGENTS.md](./AGENTS.md) before changing modules.

## Non-negotiable rules

1. **Upstream-first** ([ADR-0002](./docs/architecture/adrs/0002-upstream-first-no-reimplementation.md)): inspect and reuse AgentsKit before writing a primitive. Never reimplement the controller, lifecycle, adapters, tools, confirmation, generative UI, memory, RAG, replay, eval, or framework bindings here.
2. Shared behavior must not depend on the DOM, JSX, React hooks, or a framework-specific reactive primitive.
3. UI events and render frames cross boundaries as versioned, runtime-validated data.
4. Models may propose only registered actions and components. Unknown output is inert.
5. Side-effecting actions require explicit policy outside the model.
6. TypeScript strict mode, no `any`, and named exports only.
7. New public contracts need an ADR. Breaking public contracts need an RFC and migration path.

## Find ownership with doc-bridge

```bash
pnpm install
pnpm docs:bridge:index
pnpm docs:bridge:query ownership <id> --agent
pnpm docs:bridge:gate
```

MCP tools: `handoff.resolve`, `doc.search`, `doc.get`, `gate.status`,
`memory.classify`, `memory.promoteDraft`, and `retriever.query`.

Optional Layer 1 corpus chat (local model peers required):

```bash
pnpm docs:bridge:rag:ingest
pnpm docs:bridge:ask "Who owns the Vue renderer?"
```

## Development workflow

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm conformance:gate
pnpm docs:bridge:gate
pnpm test:e2e   # Playwright (React, React Native web, Vue)
pnpm test:pty   # Ink terminal proof
pnpm bundle:budget
```

Useful local demos:

```bash
pnpm --filter @agentskit/chat-example-react dev
pnpm --filter @agentskit/chat-example-vue dev
pnpm --filter @agentskit/chat-example-svelte dev
pnpm --filter @agentskit/chat-example-solid dev
```

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep the slice vertical: contract → runtime/app behavior → renderer impact → tests → docs/handoffs.
3. Add a [Changeset](https://github.com/changesets/changesets) for public package changes.
4. Include an **upstream-adoption** note: inspected source, reused exports, local application behavior, linked upstream work when required.
5. Ensure CI is green: lint, tests, conformance, doc-bridge gate, release gate, browser e2e, Ink PTY when relevant.

## Issue structure

Follow [issue governance](./docs/governance/issues.md). Every implementation issue needs acceptance criteria, dependencies, test plan, documentation impact, delivery mode (AFK/HITL), and Definition of Done.

## Security

Do not open public issues for vulnerabilities. Use the process in
[SECURITY.md](./SECURITY.md).

## Code of Conduct

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
