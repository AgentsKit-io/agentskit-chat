# @agentskit/chat

Framework-neutral application definitions for AgentsKit Chat.

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
