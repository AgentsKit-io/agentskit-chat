# Solid quick start

```bash
pnpm add @agentskit/chat @agentskit/chat-solid @agentskit/solid solid-js
```

```tsx
import { AgentChat } from '@agentskit/chat-solid'
import { supportChat } from './support-chat'

export function SupportChat() {
  return <AgentChat
    definition={supportChat}
    placeholder="Ask about the product"
    message={message => <article data-role={message.role}>{message.content}</article>}
  />
}
```

The shell delegates streaming, tools, confirmation, retry, editing, regeneration, and cancellation to `useChat` from `@agentskit/solid`. Typed render props customize native Solid surfaces without entering the shared definition.
