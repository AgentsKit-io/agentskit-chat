# AgentsKit upstream adoption matrix

**Status:** Proposed for human acceptance in [#31](https://github.com/AgentsKit-io/agentskit-chat/issues/31)

**Inspected:** 2026-07-10 against the current `AgentsKit-io/agentskit` source checkout. Package versions are recorded to make later drift visible; supported package releases, not private workspace paths, are the integration boundary.

## Binding rule

AgentsKit Chat is a composition layer. It may add application definitions, deterministic application behavior, policy, custom component manifests, transport, sessions, native shells, and scaffolding. It may not independently implement a reusable primitive already owned by AgentsKit.

When this matrix identifies a missing generic primitive, work moves first to `AgentsKit-io/agentskit` and remains blocked here until a supported upstream release contains it.

## Current upstream packages

| Package | Inspected version | Role in AgentsKit Chat |
|---|---:|---|
| `@agentskit/core` | 1.10.5 | Controller, chat contracts, messages, tools, memory serialization and validation, generative UI, HITL, events, errors. |
| `@agentskit/runtime` | 0.9.1 | Autonomous agent execution and shared runtime context. |
| `@agentskit/validation` | 0.2.1 | AJV-backed tool argument validation. |
| `@agentskit/memory` | 0.10.2 | Persistent `ChatMemory` implementations. |
| `@agentskit/eval` | 0.4.7 | Eval runner, recording/replay adapters, cassettes, snapshots, diffs, CI reporting. |
| `@agentskit/react` | 0.6.1 | React hook and headless chat components. |
| `@agentskit/react-native` | 0.3.1 | React Native hook and components. |
| `@agentskit/ink` | 0.9.5 | Ink hook, terminal components, theme, progress observer, and Escape stream cancellation. |
| `@agentskit/vue` | 0.3.1 | Vue composable and components. |
| `@agentskit/svelte` | 0.3.1 | Svelte store and components. |
| `@agentskit/solid` | 0.3.1 | Solid hook and components. |
| `@agentskit/angular` | 0.3.1 | Angular service and components. |

## Responsibility matrix

| Planned concern | AgentsKit source inspected | Supported public API | Disposition | AgentsKit Chat responsibility | Upstream gap |
|---|---|---|---|---|---|
| Chat configuration | `core/src/types/chat.ts` | `ChatConfig` from `@agentskit/core` | Reuse directly | Store it under `ChatDefinition.chat`; do not mirror its fields. | None for #2. |
| Chat state and lifecycle | `core/src/controller.ts`, `core/src/types/chat.ts` | `createChatController`, `ChatController`, `ChatState`, `ChatReturn` | Reuse directly | Compose deterministic application behavior around the upstream controller; never replace it. | None for #2. |
| Send, stop, retry, edit, regenerate | `core/src/controller.ts` | `ChatController` methods and framework `useChat` equivalents | Reuse directly | Expose native framework ergonomics without changing lifecycle semantics. | None. |
| Messages and tool calls | `core/src/types/message.ts`, `core/src/types/tool.ts` | `Message`, `ToolCall`, `ToolCallStatus` | Reuse directly | Add application metadata only through documented envelopes or metadata keys. | None. |
| Tool definitions | `core/src/types/tool.ts` | `ToolDefinition`, `defineTool` | Reuse directly | Treat an application action as a tool plus trusted policy keyed by tool name. No second executor. | None. |
| Tool execution | `core/src/agent-loop.ts`, `core/src/primitives.ts` | Controller/runtime execution and `executeToolCall` | Reuse controller/runtime | Supply tools and policy; never call a local duplicate tool loop. | None. |
| Argument validation | `core/src/types/tool.ts`, `validation/src/ajv-validator.ts` | `ArgsValidator`, `createAjvValidator` | Reuse directly | Enable validation at model/tool boundaries and validate application-only envelopes separately. | None. |
| Tool confirmation | `core/src/controller.ts`, framework `ToolConfirmation` components | `requiresConfirmation`, `approve`, `deny` | Reuse directly | Add identity, authorization, expiry, and audit policy before delegating approval. | None. |
| Durable HITL | `core/src/hitl.ts` | `createApprovalGate`, `ApprovalStore` from `@agentskit/core/hitl` | Reuse directly | Bind a host-provided store and application reviewer identity. | None. |
| Portable generative UI | `core/src/generative-ui.ts` | `UIMessage`, `UIElement`, `validateUIMessage`, `parseUIMessage` from `@agentskit/core/generative-ui` | Reuse and render | Render the upstream standard element set; do not redefine its discriminated union. | No blocker. Native rendering belongs to this application layer unless the primitive itself changes. |
| Custom application UI | No equivalent closed component registry upstream | Upstream `UIElement` remains available for portable primitives | Extend at application layer | Own `componentKey`, runtime props schema, native implementations, interaction event, and semantic fallback. | None: application-specific by design. |
| Message persistence | `core/src/types/memory.ts`, `core/src/memory.ts`, `memory` package | `ChatMemory`, serialization helpers, memory adapters | Reuse directly | Configure the selected message-memory implementation. | None. |
| Application session | No upstream application-session envelope | `ChatMemory` covers messages only | Add application layer | Store session id, definition/version, conversation state, policy context reference, confirmation references, and event cursor; do not duplicate messages. | None: product metadata is outside `ChatMemory`. |
| Retrieval | `core/src/types/retrieval.ts`, `core/src/rag.ts`, `rag` package | `Retriever`, `RetrievedDocument`, RAG implementations | Reuse directly | Configure retrieval and map retrieved-source metadata to UI. | None. |
| Adapter/model execution | `core` adapter contract, `adapters` package | `AdapterFactory` and provider factories | Reuse directly | Accept supported adapters through `ChatConfig`. | None. |
| Replay | `eval/src/replay/*` | `@agentskit/eval/replay` recording/replay adapters and cassettes | Reuse directly | Capture application-only decisions around upstream recorded model/tool behavior. | None. |
| Eval and snapshots | `eval/src/*` | `runEval`, `@agentskit/eval/snapshot`, `diff`, `ci` | Reuse directly | Add renderer and application-policy conformance fixtures. | None. |
| React rendering | `react/src/*` | `useChat` and headless components from `@agentskit/react` | Reuse directly | Supply an opinionated shell, slots, and application components. | None for #2. |
| React Native rendering | `react-native/src/*` | `useChat` and native components | Reuse directly | Supply a native shell and application components. | None. |
| Ink rendering | `ink/src/useChat.ts`, `ink/src/components/{InputBar,ChatContainer,Message,ThinkingIndicator}.tsx` | `useChat`, terminal components, theme | Reuse directly | Supply the terminal application shell and native presentation of the shared semantic fallback. | Escape cancellation fixed upstream by [AgentsKit #1132](https://github.com/AgentsKit-io/agentskit/issues/1132) and released in `@agentskit/ink` 0.9.5 via [PR #1133](https://github.com/AgentsKit-io/agentskit/pull/1133). |
| Vue/Svelte/Solid/Angular | Corresponding package sources | Corresponding supported composable/store/service and components | Reuse directly | Adapt only native composition conventions to the shared definition. | Verify again in each renderer issue because beta APIs may evolve. |
| Deterministic application routes | No equivalent application router required in core | `ChatController.send` remains the agentic fallback | Add application layer | Match trusted application routes before delegating unresolved input to the upstream controller. | None: intentionally above core. |
| Conversation state machine | No general public statechart contract in AgentsKit | Controller remains responsible for chat lifecycle | Add application layer initially | Coordinate application states without replacing controller lifecycle. Promote upstream only if a framework-neutral primitive proves independently useful. | Not currently proven. |
| Client-server protocol | `core/src/types/{chat,message,tool,stream}.ts`, `core/src/memory.ts` | `ChatState`, `Message`, `ToolCall`, `TokenUsage`, `MemoryRecord`, `serializeMessages`, `deserializeMessages` | Reuse canonical shapes; add application envelope | Transport validated snapshots without redefining controller or adapter stream semantics. | None: versioned application transport belongs to AgentsKit Chat. |
| Observability | Core observers and AgentsKit observability packages | `Observer` and supported integrations | Reuse directly | Add application identifiers and decisions without creating another telemetry substrate. | None. |

## Minimal `defineChat` contract for #2

The first slice uses the shallowest contract that preserves upstream ownership:

```ts
import type { ChatConfig } from '@agentskit/core'

export interface ChatDefinition {
  readonly id: string
  readonly chat: ChatConfig
}

export const defineChat = <const T extends ChatDefinition>(definition: T): T => definition
```

The React binding passes `definition.chat` to `useChat` from `@agentskit/react`. It does not instantiate a custom controller, translate lifecycle states, wrap the adapter protocol, or copy upstream components.

Fields are added to `ChatDefinition` only when a vertical issue demonstrates application-layer behavior not represented by `ChatConfig`. This avoids mirroring upstream configuration and reduces compatibility work.

## Planned application-only extensions

These are not part of #2 and require their owning vertical issues:

```ts
interface ChatDefinition {
  readonly id: string
  readonly chat: ChatConfig
  readonly routes?: readonly DeterministicRoute[]
  readonly components?: ComponentManifest
  readonly policies?: Readonly<Record<string, ActionPolicy>>
  readonly conversation?: ConversationDefinition
}
```

`routes`, `components`, `policies`, and `conversation` coordinate application behavior. They must delegate all chat lifecycle, model, tool, confirmation, memory, retrieval, and replay primitives to AgentsKit.

## Negative guardrail examples

The following changes are rejected:

- a new `ChatController` or lifecycle state equivalent;
- a custom LLM stream consumer that bypasses the AgentsKit controller;
- an action executor separate from AgentsKit tools/runtime;
- a copied `UIElement` union or generative-UI parser;
- message persistence outside `ChatMemory` without a documented upstream gap;
- independent replay adapters or eval runners;
- a renderer that bypasses its corresponding AgentsKit binding;
- imports from another repository's source tree or unpublished workspace paths.

## ChoiceList adoption record (#7)

Inspected `@agentskit/core/generative-ui` on 2026-07-11. The upstream standard union provides text, heading, list, button, image, card, stack, and artifact elements, but intentionally does not provide a closed custom application registry. AgentsKit Chat reuses the official controller and framework bindings unchanged and adds only the application registry, custom frame/event envelope, native `ChoiceList` implementations, and conformance fixtures. No upstream gap or copied implementation exists.

## Current gap verdict

No upstream change blocks #7. `ChatConfig`, framework bindings, and the standard generative-UI union are reused unchanged; the closed registry and native custom component remain the application layer described in the responsibility matrix. Later issues must repeat the source audit because upstream beta packages and the application requirements may evolve. When a genuine generic gap appears, ADR-0002 requires an AgentsKit issue and supported upstream release before local integration.
