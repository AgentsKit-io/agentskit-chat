# AgentsKit upstream adoption matrix

**Status:** Proposed for human acceptance in [#31](https://github.com/AgentsKit-io/agentskit-chat/issues/31)

**Inspected:** 2026-07-10 against the current `AgentsKit-io/agentskit` source checkout. Package versions are recorded to make later drift visible; supported package releases, not private workspace paths, are the integration boundary.

## Binding rule

AgentsKit Chat is a composition layer. It may add application definitions, deterministic application behavior, policy, custom component manifests, transport, sessions, native shells, and scaffolding. It may not independently implement a reusable primitive already owned by AgentsKit.

When this matrix identifies a missing generic primitive, work moves first to `AgentsKit-io/agentskit` and remains blocked here until a supported upstream release contains it.

## Typed application actions (#8)

The tool/controller lifecycle and official confirmation renderers were inspected. AgentsKit Chat reuses `proposeToolCall`, `approve`, and `deny` from `@agentskit/core@1.11.0`, plus the released React, React Native, and Ink `ToolConfirmation` components. The missing generic seam was resolved in [upstream #1144](https://github.com/AgentsKit-io/agentskit/issues/1144) and [PR #1145](https://github.com/AgentsKit-io/agentskit/pull/1145) before integration. Local code owns only choice declarations and session-bound metadata; it contains no executor, tool validator, controller, or confirmation widget.

## Trusted action policy (#9)

AgentsKit Chat consumes `ChatConfig.authorizeToolCall` from `@agentskit/core@1.12.0`, delivered by [upstream #1147](https://github.com/AgentsKit-io/agentskit/issues/1147) and [PR #1148](https://github.com/AgentsKit-io/agentskit/pull/1148). Upstream owns enforcement before proposal and execution. Local code adds only trusted capability resolution, composition, and replayable application traces.

## Persistent application sessions (#11)

Inspected Core `ChatMemory`, controller memory hydration, canonical tool-call status and `approve`/`deny`, plus the published Memory adapters. AgentsKit Chat stores no messages: it adds only the versioned application-session metadata envelope, definition compatibility, deterministic decisions, cursor, and confirmation bindings. Hosts combine `SessionStorage` with their selected upstream `ChatMemory`. No upstream gap or reimplementation exists.

## Web-standard handler (#12)

Inspected Core controller, adapter, stream, chat, and memory contracts plus published Memory adapters. `@agentskit/chat-server` reuses `createChatController`, canonical state/messages/tool calls, `ChatMemory`, and `StreamSource.abort`. It adds only the Web request boundary, trusted-context seam, outer deadline/cancellation, and projection into the existing snapshot protocol. Raw adapter chunks are not transported and no controller, reducer, provider client, message store, or authentication implementation is recreated.

The missing generic cancellation seam for message IO was added upstream in [AgentsKit #1155](https://github.com/AgentsKit-io/agentskit/issues/1155) and [PR #1156](https://github.com/AgentsKit-io/agentskit/pull/1156), then released as `@agentskit/core@1.12.2` via [#1157](https://github.com/AgentsKit-io/agentskit/pull/1157). The handler consumes that public contract and forwards its request/cleanup signals to `ChatMemory`.

## Current upstream packages

| Package | Inspected version | Role in AgentsKit Chat |
|---|---:|---|
| `@agentskit/core` | 1.12.2 | Controller, chat contracts, messages, tools, cancellable memory, serialization and validation, generative UI, HITL, events, errors. |
| `@agentskit/runtime` | 0.9.1 | Autonomous agent execution and shared runtime context. |
| `@agentskit/validation` | 0.2.1 | AJV-backed tool argument validation. |
| `@agentskit/memory` | 0.11.0 | Persistent `ChatMemory` implementations, including validated injectable Web Storage. |
| `@agentskit/eval` | 0.4.19 | Eval runner, recording/replay adapters, cassettes, snapshots, diffs, CI reporting, and universal replay boundaries. |
| `@agentskit/react` | 0.7.1 | React hook, headless chat components, CSS variables, and data attributes. |
| `@agentskit/react-native` | 0.4.4 | React Native hook, wrapper/content/input style pass-throughs, and testIDs. |
| `@agentskit/ink` | 0.10.1 | Ink hook, terminal components, theme provider, progress observer, and Escape stream cancellation. |
| `@agentskit/vue` | 0.4.4 | Vue composable, headless components, and controller-free slotted `ChatRoot`. |
| `@agentskit/svelte` | 0.3.1 | Svelte store and components. |
| `@agentskit/solid` | 0.4.4 | Solid hook, headless components, and owner-cleanup cancellation. |
| `@agentskit/angular` | 0.4.6 | Angular signal service, standalone components, lifecycle-safe teardown, and typed partial-Ivy AOT packaging. |

## Replayable application traces (#21)

The replay integration was initially inspected at AgentsKit revision `978ce3d77be7bbf76094b5919d240e50091bc824` and `@agentskit/eval@0.4.17`; the currently consumed release is `@agentskit/eval@0.4.19`. AgentsKit Chat consumes `createRecordingAdapter`, `createReplayAdapter`, `Cassette`, `serializeCassette`, and `parseCassette` from `@agentskit/eval/replay`. Upstream remains the sole owner of adapter recording, request fingerprints, cassettes, playback, time travel, filesystem boundaries, and eval reporting. `@agentskit/chat-devtools` adds only bounded/redacted application decisions and semantic cross-renderer comparison. No upstream gap or reimplementation exists.

## Support reference application (#22)

Inspected AgentsKit revision `978ce3d77be7bbf76094b5919d240e50091bc824`: `@agentskit/core@1.12.2` supplies `defineTool`, typed schema inference, `requiresConfirmation`, controller proposal/approve/deny, and `ChatConfig.validateArgs`; `@agentskit/validation@0.2.1` supplies `createAjvValidator`. The support example consumes those contracts and the released framework bindings directly. Local code adds only an injected ticket-service seam, trusted host context, support routes, native presentation, and executable examples. No upstream behavior is copied and no gap blocks the example.

## Responsibility matrix

| Planned concern | AgentsKit source inspected | Supported public API | Disposition | AgentsKit Chat responsibility | Upstream gap |
|---|---|---|---|---|---|
| Chat configuration | `core/src/types/chat.ts` | `ChatConfig` from `@agentskit/core` | Reuse directly | Store it under `ChatDefinition.chat`; do not mirror its fields. | None for #2. |
| Chat state and lifecycle | `core/src/controller.ts`, `core/src/types/chat.ts` | `createChatController`, `ChatController`, `ChatState`, `ChatReturn` | Reuse directly | Compose deterministic application behavior around the upstream controller; never replace it. | None for #2. |
| Send, stop, retry, edit, regenerate | `core/src/controller.ts` | `ChatController` methods and framework `useChat` equivalents | Reuse directly | Expose native framework ergonomics without changing lifecycle semantics. | None. |
| Lifecycle controls | React/RN `Message` actions and Ink `InputBar.onSubmitInput` | Published renderer extension points | Reuse directly | Add platform-native retry/edit/regenerate affordances. | None for #10. |
| Snapshot serialization | `core/src/memory.ts` | `serializeMessages` + memory validation | Reuse directly | Add the versioned turn envelope and lineage. | Undefined-field incompatibility fixed in [AgentsKit #1153](https://github.com/AgentsKit-io/agentskit/pull/1153) and released in `@agentskit/core` 1.12.1 via [#1154](https://github.com/AgentsKit-io/agentskit/pull/1154). |
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
| React rendering | `react/src/theme/{tokens,default}.css`, `react/src/components/*` | `useChat`, headless components, CSS variables, and `data-ak-*` hooks from `@agentskit/react` | Reuse directly | Supply an opinionated shell, native slots, application components, and semantic token mapping. | None. |
| React Native rendering | `react-native/src/components.tsx` | `useChat`, native components, `style`, and `testID` seams | Reuse directly | Supply a native shell, native slots, application component styles, and capability-aware token mapping. | None. |
| Ink rendering | `ink/src/useChat.ts`, `ink/src/components/{InputBar,ChatContainer,Message,ThinkingIndicator,theme}.tsx` | `useChat`, terminal components, `InkThemeProvider`, and `InkTheme` | Reuse directly | Supply the terminal application shell, native slots, semantic color mapping, and native presentation of the shared fallback. | Escape cancellation fixed upstream by [AgentsKit #1132](https://github.com/AgentsKit-io/agentskit/issues/1132) and released in `@agentskit/ink` 0.9.5 via [PR #1133](https://github.com/AgentsKit-io/agentskit/pull/1133). |
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

### Ordered assistant content

Inspected AgentsKit Core canonical `Message` and `StreamChunk` contracts plus the official framework bindings. AgentsKit Chat keeps the single canonical string message and upstream stream reducer, and adds only a bounded application-level record envelope for ordering text with its closed registered components. Text records are host-encoded and inert; component records reuse `ComponentRenderFrame` validation and manifest resolution. No upstream message, controller, stream, persistence, or generative-UI primitive is copied. See [ADR-0021](./adrs/0021-ordered-assistant-content-records.md).

### Shared Ask service integration

Docs, Registry, and Playbook use one Ask application-protocol adapter from `@agentskit/chat`. The reusable browser-memory gap was resolved first in AgentsKit [#1191](https://github.com/AgentsKit-io/agentskit/issues/1191), [PR #1192](https://github.com/AgentsKit-io/agentskit/pull/1192), and released as `@agentskit/memory@0.11.0`. AgentsKit Chat Protocol owns the versioned bounded event decoder; AgentsKit Chat composes the public `createWebStorageMemory` seam and adds only wire projection, safe citations, transport behavior, and host presentation composition. See [ADR-0022](./adrs/0022-shared-ask-service-integration.md).

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

## Theming and composition adoption record (#13)

Inspected `@agentskit/react@0.7.1` theme CSS/component attributes, `@agentskit/react-native@0.4.4` component wrapper/content/input style and `testID` pass-throughs, and `@agentskit/ink@0.10.1` `components/theme.tsx` (`InkThemeProvider`, `InkTheme`) on 2026-07-11. AgentsKit Chat consumes those seams directly and adds only runtime-validated application tokens, capability-aware mappings, and renderer-native slots. Fully headless consumers use upstream `useChat`; no local state hook, design system, or renderer primitive is recreated. The missing native text-style seams were fixed upstream in AgentsKit #1158/#1159 and released in `@agentskit/react-native@0.4.4` via #1160 before downstream integration.

## CLI adoption record (#14)

Inspected AgentsKit revision `main` on 2026-07-11: `@agentskit/cli@0.13.10` exports `writeStarterProject` from `packages/cli/src/index.ts`, implemented by `packages/cli/src/init.ts`, with the `init` command adapter in `packages/cli/src/commands/init.ts`; `@agentskit/templates@0.4.3` exports `scaffold` from `packages/templates/src/index.ts`, implemented by `packages/templates/src/scaffold.ts`. They own general AgentsKit starters and extension packages; neither represents a safe AgentsKit Chat application slice. The local CLI uses Node standard-library command/filesystem seams and generates imports of published AgentsKit contracts. It does not copy upstream templates, controller logic, adapters, or renderer primitives. No generic upstream gap blocks #14.

## Vue renderer adoption record (#15)

Inspected AgentsKit revision `a86905c7a4cac3cb0642e8acf7e9e8bb540e8886` and `@agentskit/vue@0.4.3` on 2026-07-11: `packages/vue/src/index.ts` publicly exported `useChat`, `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation`; their implementations live in `useChat.ts`, `ChatContainer.ts`, and `components.ts`. The batteries-included `ChatContainer` always created a controller and could not safely host an application shell that already consumed `useChat`. The generic gap was fixed upstream in AgentsKit #1161/#1162 by adding the controller-free, slotted `ChatRoot`, then released as `@agentskit/vue@0.4.4` via #1163 before downstream integration.

AgentsKit Chat consumes `useChat`, `ChatRoot`, and all standard components directly from `@agentskit/vue@0.4.4`. It adds only application session coordination, validated component-frame presentation, semantic theme mapping, and Vue-native scoped slots. No upstream source, controller, reactive store, renderer root, lifecycle, or confirmation behavior is copied or reimplemented.

## Svelte renderer adoption record (#16)

Inspected AgentsKit revision `19dd8b68b76b03f577ea28d232a2e59cf78014d7` and `@agentskit/svelte@0.4.3` on 2026-07-11. `packages/svelte/src/index.ts` exports `createChatStore` from `useChat.ts` plus `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation` from `components/*.svelte`. `ChatContainer` is controller-free and renders its Svelte 5 child snippet, so no upstream gap blocks #16.

AgentsKit Chat consumes those exports directly and adds only application session coordination, validated frames, semantic CSS mapping, typed customization snippets, and a keyed store-binding handoff that invokes upstream `stop` before replacing an active stream. It does not copy or recreate the upstream controller, store, components, lifecycle, streaming, or confirmation behavior.

## Solid renderer adoption record (#17)

Inspected AgentsKit revision `f35bab77ba64731f2524f9132dd02f906c85a443` and `@agentskit/solid@0.4.3` on 2026-07-11. `packages/solid/src/index.ts` exports `useChat`, `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation`. The generic cleanup gap in `useChat` was fixed in AgentsKit [#1169](https://github.com/AgentsKit-io/agentskit/pull/1169) and released as `@agentskit/solid@0.4.4` before integration.

AgentsKit Chat consumes those exports directly and adds only application session coordination, validated semantic-frame presentation, theme mapping, and Solid-native render props. No controller, store, stream consumer, lifecycle, confirmation, or headless component behavior is copied or reimplemented.

## Angular renderer adoption record (#18)

Inspected AgentsKit revision `54a34f1256f7e309227c4fb9d6b563134b137fc4` and `@agentskit/angular@0.4.3` on 2026-07-11. `packages/angular/src/index.ts` exports the `AgentskitChat` signal service plus `ChatContainerComponent`, `MessageComponent`, `InputBarComponent`, `ThinkingIndicatorComponent`, and `ToolConfirmationComponent`. The generic teardown gap in `AgentskitChat.destroy()` was fixed in AgentsKit [#1171](https://github.com/AgentsKit-io/agentskit/issues/1171)/[#1172](https://github.com/AgentsKit-io/agentskit/pull/1172). The AOT distribution and declaration-export gaps were then fixed in [#1174](https://github.com/AgentsKit-io/agentskit/issues/1174)/[#1175](https://github.com/AgentsKit-io/agentskit/pull/1175) and [#1177](https://github.com/AgentsKit-io/agentskit/issues/1177)/[#1178](https://github.com/AgentsKit-io/agentskit/pull/1178). All are released in `@agentskit/angular@0.4.6` before integration.

AgentsKit Chat consumes those exports directly and adds only application session coordination, validated semantic-frame presentation, CSS-variable theme mapping, and Angular-native content templates. No controller, signal store, stream consumer, lifecycle, confirmation, or upstream component behavior is copied or reimplemented.

## Standard component catalog adoption record (#19)

Inspected AgentsKit revision `978ce3d77be7bbf76094b5919d240e50091bc824` and `@agentskit/core@1.12.2` on 2026-07-11, especially `packages/core/src/generative-ui.ts`. AgentsKit owns `UIElement` (`text`, `heading`, `list`, `button`, `image`, `card`, `stack`, and `artifact`) plus its validators. AgentsKit Chat does not extend or copy that union. It adds only the closed application schemas, intent events, accessibility/capability metadata, native application presentations, and parity evidence established by ADR-0007/ADR-0015. No generic upstream gap blocks #19.

## Deterministic onboarding adoption record (#23)

Inspected AgentsKit revision `4d66eb192d636b53d0c7bec39894250dc71cde5f` and `@agentskit/core@1.12.2`: `ChatConfig`, `AdapterFactory`, typed tools, authorization, confirmation, and official React, React Native, and Ink bindings. AgentsKit owns controller lifecycle, messages, streams, memory, cancellation, tool execution, and confirmation. AgentsKit Chat adds only application routes, Form/ChoiceList intents, guards, and parity evidence. No upstream state-machine primitive exists, no upstream behavior is copied, and no generic gap blocks #23.

## Protected operations adoption record (#24)

Inspected AgentsKit revision `4d66eb192d636b53d0c7bec39894250dc71cde5f`, specifically `packages/core/src/chat.ts`, `packages/core/src/tool-proposal-internal.ts`, `packages/core/src/tool-authorization-internal.ts`, and confirmation exports in `packages/react`, `packages/react-native`, and `packages/ink`, consumed through `@agentskit/core@1.12.2` and the published renderer packages. The reference adds only injected operations-domain behavior and a safe trace projection. No upstream primitive is copied and no generic gap blocks #24.

## Cited RAG adoption record (#25)

Inspected AgentsKit revisions `4d66eb192d636b53d0c7bec39894250dc71cde5f` and `edb77757d2f2ca095733392657cafd8b7dd59a78`, `@agentskit/rag@0.4.12`, and `packages/rag/src/index.ts`, `rag.ts`, `types.ts`, `chunker.ts`, and `loaders.ts`. The example directly consumes `createRAG`, `RAG`, `RetrievedDocument`, and `VectorMemory`. Dogfooding found the optional S3 peer browser-bundle gap, fixed at the source in [AgentsKit #1180](https://github.com/AgentsKit-io/agentskit/issues/1180), [PR #1181](https://github.com/AgentsKit-io/agentskit/pull/1181), and release [PR #1182](https://github.com/AgentsKit-io/agentskit/pull/1182) before local integration. AgentsKit Chat adds only bounded SourceList projection, safe-link interaction resolution, and native/fallback evidence. No retrieval, chunking, embedding, storage-search, or reranking behavior is copied.

## Registry and Playbook dogfood adoption record (#27)

Inspected `@agentskit/core@1.12.3`, `@agentskit/react@0.7.4`, and the memory
package before host migration. Dogfooding found the reusable browser-storage
gap and fixed it in AgentsKit [#1191](https://github.com/AgentsKit-io/agentskit/issues/1191),
[PR #1192](https://github.com/AgentsKit-io/agentskit/pull/1192), and release
[PR #1194](https://github.com/AgentsKit-io/agentskit/pull/1194) as
`@agentskit/memory@0.11.0`. It also found three host copies of the Ask wire and
transport boundary; those moved to the shared protocol and chat packages in
[#66](https://github.com/AgentsKit-io/agentskit-chat/issues/66) and
[PR #67](https://github.com/AgentsKit-io/agentskit-chat/pull/67), released as
`v0.1.0-alpha.2`.

Hosts now own only endpoint/corpus configuration, storage identities, branding,
native presentation slots, and optional presentation-only tool projection. No
controller, reducer, stream lifecycle, decoder, memory engine, renderer, or
component protocol is copied or reimplemented. Full evidence is in the
[Registry/Playbook dogfood record](../dogfood/registry-playbook.md).

## Conversation statechart adoption record (#28)

Inspected the public `@agentskit/statechart@0.2.0` release and its exported `defineStatechart`, `createStatechartInstance`, `transitionStatechart`, immutable instance, event, definition, result, and diagnostic contracts. The generic gap recorded by the original conversation design was resolved in AgentsKit [#1199](https://github.com/AgentsKit-io/agentskit/issues/1199), [PR #1210](https://github.com/AgentsKit-io/agentskit/pull/1210), and the `0.2.0` release before downstream adoption.

AgentsKit Chat compiles its existing application conversation declaration into the upstream definition and uses upstream transitions for initial validation, dispatch, resume validation, and history rebuild. It adds only route matching and precedence, adapter fallback, application actions/traces, retained decisions, and the existing session projection. No statechart validator, transition engine, upstream source, private source, or business behavior is copied or reimplemented. See [ADR-0023](./adrs/0023-conversation-transitions-use-agentskit-statechart.md).

## Deterministic answer plane adoption record (#69)

Inspected the published `@agentskit/core@1.12.3` `AdapterFactory`, `AdapterRequest`, `AdapterContext.metadata`, `StreamSource`, `Message`, capabilities, and cancellation contracts. They already provide the correct composition seam: local application policy can select an answer before calling a backend without creating a controller or consuming its stream.

AgentsKit Chat Protocol adds only versioned application schemas for site configuration, immutable local knowledge, answer provenance, citations, suggestions, confidence, escalation, and the canonical SHA-256 verification shared by producers and consumers. AgentsKit Chat adds only bounded normalized exact lookup, explicit choice resolution, projection into its existing ordered assistant-content and standard component protocols, and delegation to the injected upstream adapter. Artifact generation and caching remain host or Doc Bridge concerns. No controller, reducer, adapter lifecycle, retrieval engine, statechart, renderer primitive, upstream source, private source, or business data is copied or reimplemented. See accepted [ADR-0024](./adrs/0024-deterministic-answer-plane.md).

The React Native release check also inspected the public `@agentskit/eval` replay exports used by devtools. A universal-bundle filesystem boundary was fixed upstream in AgentsKit [#1216](https://github.com/AgentsKit-io/agentskit/issues/1216), [PR #1217](https://github.com/AgentsKit-io/agentskit/pull/1217), and release `@agentskit/eval@0.4.19`. AgentsKit Chat consumes that release directly; it does not alias Node built-ins, copy replay behavior, or add a platform-specific fork.
