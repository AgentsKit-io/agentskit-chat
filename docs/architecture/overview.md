# Architecture overview

## Context

AgentsKit provides framework-neutral chat state and bindings for React, Vue, Svelte, Solid, Angular, React Native, and Ink. Building a product-grade interactive agent experience still requires teams to assemble deterministic routing, structured turns, action policy, component registries, sessions, streaming, persistence, replay, theming, and framework-specific shells.

AgentsKit Chat is the opinionated application framework above those primitives.

## Architectural style

The project begins as a TypeScript modular monorepo. Shared behavior is organized around deep, testable contracts; native renderers remain thin adapters over the corresponding AgentsKit binding.

## Product boundary

AgentsKit owns adapters, model invocation, tools, memory, RAG, agent runtime, chat controller, and base framework bindings. AgentsKit Chat owns application definitions, the turn pipeline, deterministic interaction, action policy, session protocol, semantic component manifests, native application shells, scaffolding, and parity tooling.

[ADR-0002](./adrs/0002-upstream-first-no-reimplementation.md) makes this boundary enforceable: AgentsKit Chat composes published AgentsKit APIs. Missing or defective framework-neutral primitives are changed at the source in `AgentsKit-io/agentskit` before this repository consumes them.

## Containers

```text
Application
├── shared chat definition
├── AgentsKit Chat server/runtime
│   └── AgentsKit runtime, adapters, tools, memory, and RAG
└── native client renderer
    └── corresponding AgentsKit UI binding
```

## Planned modules

### Core

Defines chats that compile to or derive AgentsKit `ChatConfig`, plus deterministic application routes, component manifests, conversation machines, and policy composition. It does not implement another controller, tool loop, confirmation engine, or model runtime.

### Protocol

Owns application-specific client-server events, runtime schemas, serialization, resumption, compatibility fixtures, and semantic fallbacks. Existing AgentsKit lifecycle and UI semantics are transported without being renamed or reimplemented.

### Server

Mounts chat definitions onto Web-standard handlers and provides context, authentication seams, sessions, persistence ports, streaming, cancellation, and audit hooks.

### Native renderers

React, Vue, Svelte, Solid, Angular, React Native, and Ink renderers consume the protocol and the matching AgentsKit package. Custom visual implementations are platform-specific; component identity, props schema, actions, and fallback behavior are shared.

### CLI

Detects the host framework and runtime, scaffolds a complete vertical slice, adds semantic components, validates configuration, and diagnoses renderer parity.

### Devtools and eval

Composes application traces, fixture capture, renderer conformance, accessibility evidence, and cross-platform parity reporting around AgentsKit replay and eval primitives.

## Upstream adoption

Before implementation, each issue records the AgentsKit source and exports inspected, what is reused directly, what application-layer behavior is added, and any upstream gap. A generally useful primitive is implemented in AgentsKit first; AgentsKit Chat never vendors or temporarily forks it.

Initial mandatory mappings include:

- `defineChat` → AgentsKit `ChatConfig` and `createChatController`;
- lifecycle → AgentsKit `ChatController` operations;
- actions → AgentsKit `ToolDefinition` plus application policy;
- confirmation → AgentsKit tool confirmation and HITL primitives;
- portable UI → AgentsKit `UIMessage`/`UIElement` plus registered custom components;
- message history → AgentsKit `ChatMemory`;
- replay/eval → AgentsKit replay and eval primitives;
- renderers → corresponding AgentsKit framework packages.

## Reference turn pipeline

```text
input
  -> deterministic route or conversation transition
  -> AgentsKit agent when interpretation/generation is required
  -> runtime-validated turn envelope
  -> component/action registry validation
  -> authorization, confirmation, and action policy
  -> versioned events
  -> native renderer and persistence
```

## Initial architecture proof

The first shared example must run from one unchanged chat definition in React, React Native, and Ink. These targets exercise DOM, native mobile, and terminal constraints. Vue, Svelte, Solid, and Angular follow once the universal contract survives those three environments.

## Risks

- Framework parity may become superficial. Mitigation: shared conformance fixtures and behavioral gates.
- The framework may duplicate AgentsKit. Mitigation: dependency-direction checks and explicit ownership rules.
- Generative UI can become unsafe. Mitigation: closed registries, runtime schemas, inert unknown output, semantic fallback, and action policy outside the model.
- Package proliferation may create shallow modules. Mitigation: packages are introduced only by vertical implementation slices with a public outcome.
