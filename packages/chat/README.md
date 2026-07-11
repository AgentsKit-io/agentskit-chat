# @agentskit/chat

Framework-neutral application definitions for AgentsKit Chat.

```ts
const definition = defineChat({ id: 'support', chat: agentskitChatConfig })
```

`defineChat` preserves the upstream `ChatConfig`; it does not create another runtime.
