---
title: React quick start
description: Render an AgentsKit Chat definition with the native React shell.
---

Define the product once. Render it with `@agentskit/chat/react`.

## 1. Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/react react
```

## 2. Define the chat

Keep the definition framework-neutral so Vue, Ink, or React Native can import the same module later.

```ts
import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const createSupportChat = (adapter: AdapterFactory) =>
  defineChat({
    id: 'support',
    chat: {
      adapter,
      systemPrompt: 'Help users understand the product.',
    },
  })
```

## 3. Render the shell

```tsx
import { AgentChat } from '@agentskit/chat/react'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

export const Support = () => (
  <AgentChat
    definition={createSupportChat(adapter)}
    placeholder="Ask about the product"
  />
)
```

`AgentChat` passes `definition.chat` to `useChat` from `@agentskit/react`. Streaming, tools, memory,
retry, editing, regeneration, confirmation, and cancellation remain AgentsKit behavior.

## 4. Run the repository example

From the monorepo root:

```bash
pnpm install
pnpm --filter @agentskit/chat-example-react dev
```

Send any message for a deterministic streamed response. Send `/fail` to verify the accessible error
path without a provider key.

## Next

- [Get started overview](/docs/getting-started)
- [Routes and state](/docs/conversation/routes-and-state)
- [Action policy](/docs/actions/policy)
- [Theming](/docs/theming-and-composition)
