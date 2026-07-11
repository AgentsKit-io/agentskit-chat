# React quick start

AgentsKit Chat keeps the upstream AgentsKit configuration intact and adds a small application definition.

```ts
import { openai } from '@agentskit/adapters'
import { defineChat } from '@agentskit/chat'

export const supportChat = defineChat({
  id: 'support',
  chat: {
    adapter: openai({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4.1-mini',
    }),
    systemPrompt: 'Help users understand the product.',
  },
})
```

Render it with the native React binding:

```tsx
import { AgentChat } from '@agentskit/chat-react'
import { supportChat } from './support-chat'

export const Support = () => (
  <AgentChat definition={supportChat} placeholder="Ask about the product" />
)
```

`AgentChat` passes `supportChat.chat` directly to `useChat` from `@agentskit/react`. Streaming, tools, memory, retry, editing, regeneration, confirmation, and cancellation remain AgentsKit behavior.

Run the deterministic repository example:

```bash
pnpm install
pnpm dev
```

Send any message to receive a deterministic streamed response. Send `/fail` to verify the accessible error path without a provider key.
