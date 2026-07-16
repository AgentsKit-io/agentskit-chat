# API reference

All packages use named exports. Runtime input must enter through the exported
schemas, decoders, or resolvers; TypeScript types alone are not a trust boundary.

| Package | Primary public API |
|---|---|
| `@agentskit/chat/protocol` | Turn/session/component schemas and codecs, ordered assistant content, Ask events, deterministic answer contracts, conformance fixtures via `/protocol/fixtures`. |
| `@agentskit/chat` | `defineChat`, sessions, controlled-session driver, deterministic routes, conversation composition, component manifest/resolution, semantic theme/fallback, action confirmation/policy, Ask adapter/memory, deterministic answer adapter. |
| `@agentskit/chat/server` | `createChatHandler`, `ChatHandlerOptions`, `ChatHandlerError`; standard `Request` → streaming `Response`. |
| `@agentskit/chat/react` | `AgentChat`, `ChoiceList`, `StandardComponent`, native slots, `toChatCssVariables`. |
| `@agentskit/chat/react-native` | `AgentChatNative`, `ChoiceListNative`, `StandardComponentNative`, native slots/styles, `toChatNativeStyles`. |
| `@agentskit/chat/ink` | `AgentChat`, `ChoiceList`, `StandardComponent`, `SemanticFallback`, native slots, `toChatInkTheme`. |
| `@agentskit/chat/vue` | `AgentChat`, `ChoiceList`, `StandardComponent`, scoped slots, `toChatCssVariables`. |
| `@agentskit/chat/svelte` | `AgentChat`, `ChoiceList`, `StandardComponent`, typed snippets, `toChatCssVariables`, `toChatStyle`. |
| `@agentskit/chat/solid` | `AgentChat`, `ChoiceList`, `StandardComponent`, render props, `toChatCssVariables`. |
| `@agentskit/chat/angular` | `AgentChatComponent`, `ChoiceListComponent`, `StandardComponentComponent`, content templates, `toChatCssVariables`. |
| `@agentskit/chat-cli` | `CHAT_RENDERERS`, `detectRenderer`, `initChatProject`, `addChatComponent`; binary `agentskit-chat`. |
| `@agentskit/chat/devtools` | Trace capture/projection, replay fixture codecs, and `compareRendererOutcomes`. Model recording/replay remains in `@agentskit/eval/replay`. |

Renderer shells accept the same `ChatDefinition` while exposing native slots,
templates, snippets, render props, or styles. They delegate controller state,
streaming, messages, tools, cancellation, retry/edit/regenerate, and base
confirmation behavior to the corresponding AgentsKit binding.

`createControlledChatDriver` validates an external serializable snapshot and
projects host lifecycle callbacks through the canonical AgentsKit `ChatReturn`
shape. The React and Ink `AgentChat` renderers accept that source through their
optional `controlled` prop; their existing definition-owned modes are
unchanged.

The generated declarations in each package's published `dist` directory are
the exact signature reference. See the package README and the matching
[quick start](/docs/getting-started) for executable composition.
