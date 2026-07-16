---
title: Positioning
description: Why AgentsKit Chat is the go-to framework for multi-surface AI chat interfaces.
---

# Positioning

## One-line

**AgentsKit Chat** is the cross-framework application layer for interactive agent experiences —
**one definition, native shells on every AgentsKit UI binding.**

## The problem it solves

Teams do not ship “a chat component.” They ship a product that appears as:

- a web assistant in the app
- a mobile companion
- a desktop or embedded surface
- a terminal / ops CLI

If each client reinvents streaming, tools, confirmation, and session rules, the agent becomes seven
products with seven failure modes. AgentsKit Chat makes **the application contract** the unit of
reuse — not a screenshot of a React chat bubble.

## Product promise

**One agent experience. Every interface.**

You get:

- typed chat definitions (`defineChat`)
- deterministic routes and conversational state machines
- schema-backed interactive components
- typed actions with policy and human confirmation
- sessions, streaming, persistence, replay hooks
- semantic theming and native renderers for every AgentsKit UI binding
- a framework-aware `init` command

AgentsKit remains the substrate for adapters, models, tools, memory, RAG, runtime, and framework
bindings. Chat composes those primitives into full interactive applications.

## What it is not

| Adjacent tool | Difference |
| --- | --- |
| **Vercel AI SDK UI** | Excellent React-first hooks and transport for streaming UIs. Chat is framework-neutral application contracts (routes, policy, components, sessions) with seven native renderers. |
| **assistant-ui** | Outstanding React assistant primitives. Chat reuses AgentsKit runtime/bindings and targets web, native mobile, and terminal with a shared protocol. |
| **CopilotKit** | Productized copilots and backend integrations, often React-centric. Chat is an open MIT application framework above AgentsKit — not a hosted copilot SaaS. |
| **AgentsKit core** | Runtime, adapters, tools, memory, RAG, base UI bindings. Chat composes those primitives; it does not replace them ([ADR-0002](/docs/architecture/adrs/0002-upstream-first-no-reimplementation)). |

## When to choose it

- You need the **same** agent application on more than one of: React, Vue, Svelte, Solid, Angular, React Native, Ink.
- You already use or want AgentsKit adapters/runtime and refuse to reimplement them.
- You want deterministic routes, closed component registries, and capability policy **outside** the model.
- You care that terminal and mobile are first-class — not afterthoughts.

## When not to choose it

- You only need a React chat UI and are happy assembling AI SDK pieces.
- You need a multi-tenant hosted SaaS control plane (out of Chat’s v0 scope — see AKOS for enterprise ops).
- You need automatic conversion of arbitrary custom components across frameworks (not a goal).

## Narrative for decision makers

If AI is the new UI layer, **the chat signature is the product API**. AgentsKit Chat is how you keep
that API stable while the glass changes — browser, phone, or terminal — without locking yourself to
one frontend religion.
