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

Shared Ask-service hosts use `createAskAdapter` and `createAskSessionMemory`. The adapter owns the validated NDJSON boundary and ordered text/source projection; memory composes `@agentskit/memory/web-storage` rather than implementing another message store. A resumed application session is forwarded through the additive Ask request, and deterministic escalations contribute bounded low-confidence context. Trusted site/corpus authority remains server-side. See [`docs/protocol/ask-service.md`](../../docs/protocol/ask-service.md).

To answer exact local facts before Ask or another backend, verify the artifact and compose `createDeterministicAnswerAdapter({ artifact, expectedContentHash, expectedSiteId, fallbackMode, fallback })`. Wire its `resolveChoiceSubmission` into `definition.choiceSubmission` so only adapter-projected, single-use choices can submit their visible alias. One exact match renders locally, ambiguity exposes visible unique choices across all seven renderers, disabled fallback never calls the backend, and bounded successful backend streams receive the same answer envelope on completion. The contract is accepted in ADR-0024; see [`docs/protocol/deterministic-answers.md`](../../docs/protocol/deterministic-answers.md).
