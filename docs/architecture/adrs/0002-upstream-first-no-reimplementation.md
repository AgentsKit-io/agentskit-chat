# ADR-0002: Upstream-first and no reimplementation

**Status:** Accepted

**Date:** 2026-07-10

## Context

AgentsKit Chat is an application framework built on AgentsKit. AgentsKit already owns the chat controller, lifecycle, framework bindings, generative UI primitives, tools, confirmation, memory, RAG, runtime, replay, eval, and observability contracts.

Without an explicit dependency rule, AgentsKit Chat could accidentally create parallel implementations with slightly different types and behavior. That would weaken interoperability, split fixes between repositories, and make the dogfood claim false.

## Decision

AgentsKit Chat follows an **upstream-first** rule:

1. Search the current AgentsKit source and public API before designing or implementing a primitive.
2. Reuse an existing AgentsKit contract directly when it satisfies the requirement.
3. Adapt or compose the contract inside AgentsKit Chat when only application-level policy or developer experience is missing.
4. If a framework-neutral primitive is missing or defective, change it in [`AgentsKit-io/agentskit`](https://github.com/AgentsKit-io/agentskit) first, with its own issue, ADR when required, tests, release, and compatibility path.
5. Consume the released upstream API from AgentsKit Chat. Do not copy source, fork behavior, vendor private files, or depend on unpublished workspace paths.

AgentsKit Chat may own a new contract only when it is specific to the application-framework layer and cannot be useful independently of that layer. The issue or ADR introducing it must document why composition of existing AgentsKit APIs is insufficient.

## Ownership matrix

| Concern | Owner | AgentsKit Chat rule |
|---|---|---|
| Model adapters and model invocation | AgentsKit | Configure and consume; never wrap provider protocols independently. |
| Chat state and lifecycle | AgentsKit `ChatController` | `defineChat` compiles to or derives `ChatConfig`; never create a parallel controller. |
| Streaming, stop, retry, edit, regenerate | AgentsKit | Transport existing lifecycle semantics; do not redefine them. |
| Tools and execution loop | AgentsKit `ToolDefinition` and runtime | Application actions compile to tools plus trusted policy metadata; no second executor. |
| Tool argument validation | AgentsKit validation seam | Supply validators and schemas; fix generic validation gaps upstream. |
| Human confirmation | AgentsKit tool confirmation and HITL primitives | Add product policy, identity, expiry, and audit by composition. |
| Generative UI primitives | AgentsKit `UIMessage` and `UIElement` | Reuse for the standard portable element set; extend only through an application component registry. |
| Chat message memory | AgentsKit `ChatMemory` | Reuse for messages; session envelopes store only application metadata not represented upstream. |
| RAG and retrieval | AgentsKit | Configure retrievers and render retrieved-source metadata. |
| Replay and eval primitives | AgentsKit | Compose application traces and renderer conformance around upstream fixtures. |
| Framework hooks and stores | AgentsKit renderer packages | Each native renderer consumes its corresponding package directly. |
| Deterministic application routes | AgentsKit Chat | Own because they coordinate application behavior before model dispatch. |
| Conversation statecharts | AgentsKit Chat unless generalized upstream | Own application transitions; promote a generally useful primitive upstream before reuse. |
| Application authorization and policy | Host application + AgentsKit Chat seam | Keep authority outside the model and outside low-level AgentsKit primitives. |
| Custom component registry | AgentsKit Chat | Own semantic component identity, runtime props validation, native implementations, and fallback. |
| Client-server application protocol | AgentsKit Chat | Transport upstream lifecycle plus application events; do not rename or alter upstream semantics. |
| CLI and project scaffolding | AgentsKit Chat | Generate composition around published AgentsKit packages. |

## Required issue evidence

Every implementation issue must include an **Upstream adoption** section containing:

- AgentsKit source and exports inspected;
- existing primitives reused;
- application-layer behavior added;
- upstream gap, if any, with a linked AgentsKit issue or PR;
- explicit confirmation that no upstream source is copied or reimplemented.

Code review must reject a change when equivalent behavior already exists upstream or when a generally useful primitive is added locally without an upstream decision.

## Source-change protocol

When an upstream change is required:

1. Open or link an issue in `AgentsKit-io/agentskit` describing the primitive-level gap.
2. Implement and test the fix in AgentsKit under its compatibility and ADR rules.
3. Publish or otherwise make the supported upstream version available.
4. Update AgentsKit Chat's declared compatibility range.
5. Implement only the application-layer composition in this repository.

Temporary copied implementations and private cross-repository imports are forbidden, even behind feature flags. Work remains blocked until the supported upstream contract exists.

## Consequences

- AgentsKit remains the single source of truth for reusable agent and chat primitives.
- AgentsKit Chat dogfoods published APIs rather than a privileged internal path.
- Some AgentsKit Chat issues may block on upstream releases.
- Cross-repository work is more explicit, but fixes benefit every AgentsKit consumer.
- The application framework stays smaller and focuses on composition, policy, protocol, and developer experience.

