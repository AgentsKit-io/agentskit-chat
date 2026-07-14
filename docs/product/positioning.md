# Positioning

## One-line

**AgentsKit Chat** is the cross-framework application layer for interactive agent
experiences — one definition, native shells on every AgentsKit UI binding.

## What it is not

| Adjacent tool | Difference |
|---------------|------------|
| **Vercel AI SDK UI** | React-first hooks and transport for streaming UIs. AgentsKit Chat is framework-neutral application contracts (routes, policy, components, sessions) with seven native renderers. |
| **assistant-ui** | Excellent React assistant primitives and composition. AgentsKit Chat reuses AgentsKit runtime/bindings and targets web, native mobile, and terminal with a shared protocol. |
| **CopilotKit** | Productized copilots and backend integrations, often React-centric. AgentsKit Chat is an open MIT application framework above the AgentsKit substrate, not a hosted copilot SaaS. |
| **AgentsKit core** | Runtime, adapters, tools, memory, RAG, and base UI bindings. AgentsKit Chat composes those primitives; it does not replace them ([ADR-0002](../architecture/adrs/0002-upstream-first-no-reimplementation.md)). |

## When to choose it

- You already use or want AgentsKit adapters/runtime.
- You need the same agent application on React, Vue, Svelte, Solid, Angular, React Native, and/or Ink.
- You want deterministic routes, closed component registries, and capability policy outside the model.

## When not to choose it

- You only need a React chat UI and are happy assembling AI SDK pieces.
- You need a multi-tenant hosted SaaS control plane (out of v0 scope).
- You need automatic conversion of arbitrary custom components across frameworks.
