---
title: Solid quick start
description: Render an AgentsKit Chat definition with the native Solid shell.
---

# Solid quick start

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/solid solid-js
```

## Shell

```tsx
import { AgentChat } from '@agentskit/chat/solid'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

const definition = createSupportChat(adapter)

export function SupportChat() {
  return (
    <AgentChat
      definition={definition}
      placeholder="Ask about the product"
      message={(message) => (
        <article data-role={message.role}>{message.content}</article>
      )}
    />
  )
}
```

The shell delegates streaming, tools, confirmation, retry, editing, regeneration, and cancellation
to `useChat` from `@agentskit/solid`. Typed render props customize native Solid surfaces without
entering the shared definition.

## Next

- [Get started overview](/docs/getting-started)
- [Shared definition pattern](/docs/getting-started/react)
