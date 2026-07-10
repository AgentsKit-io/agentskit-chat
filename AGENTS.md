# AGENTS.md

Read this file before making changes to AgentsKit Chat.

## Purpose

AgentsKit Chat is the cross-framework application layer for interactive agent experiences built on AgentsKit. It shares behavior, protocols, actions, state, and component manifests across platforms while preserving native rendering in each supported framework.

## Non-negotiable rules

1. Depend on AgentsKit; do not recreate its adapters, runtime, tools, memory, RAG, or chat controller.
2. Framework interoperability is a contract. Shared behavior cannot depend on the DOM, JSX, React hooks, or a framework-specific reactive primitive.
3. UI events and render frames cross boundaries as versioned, runtime-validated data.
4. Models may propose only registered actions and registered components. Unknown or invalid output is inert.
5. Side-effecting actions require explicit policy. Confirmation, authorization, and audit run outside the model.
6. TypeScript strict mode, no `any`, and named exports only.
7. New public contracts require an ADR. Breaking public contracts require an RFC and migration path.
8. Every issue must include acceptance criteria, dependencies, test plan, documentation impact, and Definition of Done.

## Planned module ownership

The approved architecture currently identifies these modules. Their package boundaries are created only by implementation issues; do not add empty packages.

- Core: chat definitions, turn pipeline, deterministic routes, actions, component manifests, state machines.
- Protocol: versioned events, transports, serialization, compatibility fixtures.
- Server: handlers, sessions, context, authentication seams, persistence, streaming.
- Renderers: React, Vue, Svelte, Solid, Angular, React Native, and Ink bindings over their corresponding AgentsKit packages.
- CLI: project detection, `init`, templates, add-component workflow, diagnostics.
- Devtools and eval: replay, traces, parity suites, accessibility and renderer conformance.

## Documentation and routing

Use `@agentskit/doc-bridge` before editing a module:

```bash
pnpm docs:bridge:index
pnpm docs:bridge:query ownership <id> --agent
pnpm docs:bridge:gate
```

MCP is enabled with `handoff.resolve`, `doc.search`, `doc.get`, and `gate.status`.

## Current phase

The repository is docs-first. Until the implementation backlog is approved, changes are limited to product, architecture, governance, and planning documentation.

