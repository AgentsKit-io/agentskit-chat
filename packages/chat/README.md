# @agentskit/chat

Framework-neutral application definitions for AgentsKit Chat.

The package also provides session-scoped deterministic routes and explicit conversation-state projections while unresolved turns stay on the upstream AgentsKit controller.

```ts
const definition = defineChat({ id: 'support', chat: agentskitChatConfig })
```

`defineChat` preserves the upstream `ChatConfig`; it does not create another runtime.

The package also owns the runtime-validated semantic fallback envelope shared by native renderers:

```ts
const fallback = parseSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' })
formatSemanticFallback(fallback)
// [unsupported visual: chart] Revenue rose 12%.
```

Custom application UI is declared through `defineComponentManifest`. The first schema-backed component is `ChoiceListComponent`; untrusted frames must pass `resolveComponentFrame` before rendering.
