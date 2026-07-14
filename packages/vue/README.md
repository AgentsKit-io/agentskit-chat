# @agentskit/chat/vue

Native Vue 3 application shell for AgentsKit Chat. It composes `useChat`, `ChatRoot`, and the headless components published by `@agentskit/vue`; chat state and lifecycle remain upstream.

```ts
import { AgentChat } from '@agentskit/chat/vue'
```

Use the named scoped slots `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList` for Vue-native customization.
