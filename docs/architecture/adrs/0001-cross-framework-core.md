# ADR-0001: Framework-neutral core with native renderers

**Status:** Accepted

**Date:** 2026-07-10

## Context

AgentsKit supports React, Vue, Svelte, Solid, Angular, React Native, and Ink through a shared chat controller. AgentsKit Chat must add application-level behavior without choosing one renderer as the canonical implementation or weakening platform-native developer experience.

## Decision

Chat definitions, turn events, actions, policies, component manifests, conversation state, sessions, and compatibility fixtures are framework-neutral and runtime validated.

Every renderer is a native adapter over its corresponding AgentsKit binding. Custom components share identity, props schemas, actions, and semantic fallbacks, but their visual implementation may differ by platform.

React, React Native, and Ink are the initial architecture-proof targets. The remaining web renderers follow the validated contract.

## Alternatives considered

1. React-first core with wrappers for other frameworks. Rejected because it leaks JSX, hooks, DOM assumptions, and React lifecycle semantics into the public contract.
2. Web Components as the only renderer. Rejected because they do not provide a native experience in React Native or Ink and weaken framework-specific composition.
3. Fully independent implementations. Rejected because behavior and security would drift across platforms.

## Consequences

- Behavior, sessions, actions, and tests can be shared across interfaces.
- Renderer packages remain native and independently installable.
- Visual components cannot always be source-compatible across platforms.
- A conformance suite and semantic fallback contract become mandatory.

