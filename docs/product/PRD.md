# PRD: AgentsKit Chat v0 foundation

## Problem statement

AgentsKit developers can build chat interfaces across several frameworks, but product-grade interactive agent applications still require substantial repeated architecture. Teams must independently design structured turns, deterministic interaction, safe actions, component registries, sessions, streaming, persistence, theming, scaffolding, and cross-platform behavior. These implementations drift and obscure the fact that AgentsKit provides the underlying primitives.

## Solution

Create an open-source, MIT-licensed, cross-framework application framework on top of AgentsKit. Developers define agent behavior, actions, components, policies, sessions, and deterministic flows once, then render native experiences in React, Vue, Svelte, Solid, Angular, React Native, and Ink.

The initial architecture proof delivers one unchanged shared chat definition through React, React Native, and Ink. The project then expands renderer parity, scaffolding, server integrations, persistence, documentation, devtools, and dogfood migrations.

## User stories

1. As an application developer, I want to define a chat once so that its behavior is shared by web, mobile, and terminal clients.
2. As an AgentsKit user, I want the framework to consume AgentsKit packages directly so that I keep the same adapters, tools, memory, RAG, and runtime ecosystem.
3. As a developer, I want typed actions so that a model cannot execute arbitrary application operations.
4. As a product owner, I want sensitive actions to require confirmation so that the user remains in control.
5. As a security engineer, I want authorization and policy outside the model so that natural-language output cannot grant capabilities.
6. As a UI developer, I want schema-backed component manifests so that agents can render interactive interfaces safely.
7. As a terminal user, I want semantic fallbacks so that every supported interaction remains usable without a graphical renderer.
8. As a designer, I want semantic theme tokens and framework-native customization so that the chat fits the host product.
9. As a framework user, I want headless access and composable slots so that I can replace the default presentation.
10. As a user, I want streaming, cancellation, retry, editing, and regeneration so that the experience feels responsive and controllable.
11. As a returning user, I want persistent sessions that can resume on another client so that conversations are not tied to one interface.
12. As an operator, I want deterministic routes and conversation state machines so that known workflows do not depend on model interpretation.
13. As an operator, I want replayable turn traces so that I can explain how a response or action was produced.
14. As a tester, I want shared contract fixtures so that every renderer demonstrates equivalent behavior.
15. As an accessibility reviewer, I want platform-appropriate semantics and keyboard or assistive interaction so that the default experience is usable.
16. As a new user, I want an `init` command that detects my framework so that I can launch a working chat without assembling infrastructure.
17. As a developer, I want to add a semantic component through the CLI so that its contract and platform implementations stay aligned.
18. As a maintainer, I want versioned protocol schemas and compatibility tests so that clients and servers can evolve independently.
19. As a framework maintainer, I want ownership and documentation discoverable through doc-bridge so that agents edit the correct module.
20. As an AgentsKit maintainer, I want real applications to exercise every UI binding so that interoperability gaps are discovered upstream.
21. As an ecosystem user, I want complete support, onboarding, operations, and RAG examples so that the framework is not perceived as documentation-only.
22. As a framework maintainer, I want black-box consumer requirements validated through synthetic public examples so hosts retain only product-specific behavior.
23. As an AgentsKit site maintainer, I want to migrate the existing Ask experience so that public dogfood uses the released framework.
24. As a Playbook or Registry maintainer, I want the shared framework widget and runtime so that duplicated chat implementations disappear.

## Implementation decisions

- Use a TypeScript modular monorepo with pnpm, strict typing, named exports, Vitest, Playwright where applicable, and Changesets for public packages.
- Keep the shared core independent of DOM and framework-specific reactive primitives.
- Use versioned runtime schemas for model output and client-server events.
- Build native renderer packages over the matching AgentsKit binding.
- Prove the contract first with React, React Native, and Ink.
- Treat UI components as semantic identities with shared props schemas and platform implementations.
- Require text or semantic fallback for every portable component.
- Keep authorization, confirmation, action execution, secret handling, and audit outside model control.
- Use Web-standard handlers and events so Node, serverless, and edge-compatible adapters can be layered without changing chat definitions.
- Use `@agentskit/doc-bridge` from repository creation for ownership, retrieval, gates, MCP, and ecosystem federation.

## Testing decisions

- Test public behavior rather than internal implementation details.
- Maintain shared fixtures for turn parsing, action policy, component validation, streaming, resumption, and fallback behavior.
- Run renderer conformance tests against the same fixtures.
- Require accessibility evidence for graphical renderers and keyboard-flow evidence for Ink.
- Add end-to-end examples that reuse one shared definition across React, React Native, and Ink.
- Use dogfood migrations as integration evidence only after the standalone examples pass.

## Out of scope

- Replacing AgentsKit adapters, runtime, memory, RAG, tools, or existing framework bindings.
- Automatic source-level conversion of arbitrary custom UI components between frameworks.
- A hosted multi-tenant SaaS in the first release.
- Visual workflow authoring in the first release.
- Guaranteeing identical visual layout across DOM, native mobile, and terminal environments.

## Further notes

The product position is: **One agent experience. Every interface.** The framework is an opinionated application layer for interactive agent experiences, not a competing low-level agent framework.
