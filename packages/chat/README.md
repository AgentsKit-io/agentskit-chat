# @agentskit/chat

Framework-neutral application definitions for AgentsKit Chat.

Actionable choices use `createActionConfirmation`, which delegates validation, canonical confirmation state, approval, denial, and execution to AgentsKit.

Use `createCapabilityPolicy` and `withActionPolicy` to default-deny actions from trusted session capabilities while keeping enforcement in AgentsKit.

The package also provides session-scoped deterministic routes and explicit conversation-state projections while unresolved turns stay on the upstream AgentsKit controller. Conversation definitions compile to published `@agentskit/statechart`; this package retains application routing and session composition rather than implementing another transition engine.

```ts
const definition = defineChat({ id: 'support', chat: agentskitChatConfig })
```

`defineChat` preserves the upstream `ChatConfig`; it does not create another runtime.

Use `resumeChatSession(definition, { sessionId, storage })` for cross-client application metadata and pass the returned session to any renderer. Keep messages in `definition.chat.memory` using upstream `ChatMemory`.

The package also owns the runtime-validated semantic fallback envelope shared by native renderers:

```ts
const fallback = parseSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' })
formatSemanticFallback(fallback)
// [unsupported visual: chart] Revenue rose 12%.
```

Custom application UI is declared through `defineComponentManifest`. The first schema-backed component is `ChoiceListComponent`; untrusted frames must pass `resolveComponentFrame` before rendering.

Shared Ask-service hosts use `createAskAdapter` and `createAskSessionMemory`. The adapter owns the validated NDJSON boundary and ordered text/source projection; memory composes `@agentskit/memory/web-storage` rather than implementing another message store. See [`docs/protocol/ask-service.md`](../../docs/protocol/ask-service.md).
