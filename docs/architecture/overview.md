# Architecture overview

## Context

AgentsKit provides framework-neutral chat state and bindings for React, Vue, Svelte, Solid, Angular, React Native, and Ink. Building a product-grade interactive agent experience still requires teams to assemble deterministic routing, structured turns, action policy, component registries, sessions, streaming, persistence, replay, theming, and framework-specific shells.

AgentsKit Chat is the opinionated application framework above those primitives.

## Architectural style

The project begins as a TypeScript modular monorepo. Shared behavior is organized around deep, testable contracts; native renderers remain thin adapters over the corresponding AgentsKit binding.

## Product boundary

AgentsKit owns adapters, model invocation, tools, memory, RAG, agent runtime, chat controller, and base framework bindings. AgentsKit Chat owns application definitions, the turn pipeline, deterministic interaction, action policy, session protocol, semantic component manifests, native application shells, scaffolding, and parity tooling.

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

Defines chats, deterministic routes, actions, component manifests, conversation machines, policies, and the turn pipeline without framework or transport dependencies.

### Protocol

Owns versioned client-server events, runtime schemas, serialization, resumption, compatibility fixtures, and semantic fallbacks.

### Server

Mounts chat definitions onto Web-standard handlers and provides context, authentication seams, sessions, persistence ports, streaming, cancellation, and audit hooks.

### Native renderers

React, Vue, Svelte, Solid, Angular, React Native, and Ink renderers consume the protocol and the matching AgentsKit package. Custom visual implementations are platform-specific; component identity, props schema, actions, and fallback behavior are shared.

### CLI

Detects the host framework and runtime, scaffolds a complete vertical slice, adds semantic components, validates configuration, and diagnoses renderer parity.

### Devtools and eval

Provides deterministic replay, turn traces, fixture capture, renderer conformance, accessibility evidence, and cross-platform parity reporting.

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

