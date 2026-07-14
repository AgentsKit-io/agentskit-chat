# AGENTS.md

Read this file before making changes to AgentsKit Chat.

## Purpose

AgentsKit Chat is the cross-framework application layer for interactive agent experiences built on AgentsKit. It shares behavior, protocols, actions, state, and component manifests across platforms while preserving native rendering in each supported framework.

## Non-negotiable rules

1. Follow [ADR-0002](./docs/architecture/adrs/0002-upstream-first-no-reimplementation.md): inspect and reuse AgentsKit before writing a primitive. Never recreate its controller, lifecycle, adapters, tools, confirmation, generative UI, memory, RAG, replay, eval, or framework bindings.
2. Framework interoperability is a contract. Shared behavior cannot depend on the DOM, JSX, React hooks, or a framework-specific reactive primitive.
3. UI events and render frames cross boundaries as versioned, runtime-validated data.
4. Models may propose only registered actions and registered components. Unknown or invalid output is inert.
5. Side-effecting actions require explicit policy. Confirmation, authorization, and audit run outside the model.
6. TypeScript strict mode, no `any`, and named exports only.
7. New public contracts require an ADR. Breaking public contracts require an RFC and migration path.
8. Every issue must include acceptance criteria, dependencies, test plan, documentation impact, and Definition of Done.
9. A missing framework-neutral primitive or defect is fixed in `AgentsKit-io/agentskit` first. AgentsKit Chat consumes the supported upstream release; copied source, private workspace imports, and temporary forks are forbidden.
10. Every implementation issue and review must include an upstream-adoption record: inspected source, reused exports, local application behavior, and linked upstream work when required.

## Planned module ownership

The approved architecture currently identifies these modules. Their package boundaries are created only by implementation issues; do not add empty packages.

- Core: chat definitions that compile to AgentsKit configuration, deterministic application routes, policy composition, component manifests, and conversation state machines.
- Protocol: versioned events, transports, serialization, compatibility fixtures.
- Server: handlers, sessions, context, authentication seams, persistence, streaming.
- Renderers: React, Vue, Svelte, Solid, Angular, React Native, and Ink bindings over their corresponding AgentsKit packages.
- CLI: project detection, `init`, templates, add-component workflow, diagnostics.
- Devtools and eval: application traces and renderer parity composed around AgentsKit replay and eval primitives.

## Documentation and routing

Use `@agentskit/doc-bridge` before editing a module:

```bash
pnpm docs:bridge:index
pnpm docs:bridge:query ownership <id> --agent
pnpm docs:bridge:gate
pnpm docs:bridge:doctor
```

MCP is enabled with `handoff.resolve`, `doc.search`, `doc.get`, `gate.status`,
`memory.classify`, `memory.promoteDraft`, and `retriever.query`.

Optional Layer 1 (local Ollama peers for RAG/chat; never required for CI):

```bash
pnpm docs:bridge:rag:ingest
pnpm docs:bridge:ask "Who owns packages/vue?"
pnpm docs:bridge:memory:ingest
```

## Current phase

The v0 backlog is approved. Implementation proceeds in dependency order from the GitHub milestone, with ADR-0002 upstream-adoption evidence and the issue Definition of Done enforced for every slice.
