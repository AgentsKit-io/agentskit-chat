---
title: React Native quick start
description: Render an AgentsKit Chat definition with Expo / React Native.
---

# React Native quick start

Mobile is a first-class surface. Use the same `defineChat` definition as web and terminal.

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/react-native react react-native
```

Native dependencies belong to the Expo (or RN) application, not the Chat package.

## Shared definition

```ts
import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const createSupportChat = (adapter: AdapterFactory) =>
  defineChat({
    id: 'support',
    chat: { adapter, systemPrompt: 'Help users on mobile.' },
  })
```

## Native shell

```tsx
import { AgentChatNative } from '@agentskit/chat/react-native'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

export default function App() {
  return <AgentChatNative definition={createSupportChat(adapter)} />
}
```

## Example app

```bash
pnpm --filter @agentskit/chat-example-react-native start
```

The Expo example keeps deterministic fixtures private — they are test infrastructure, not a
published API.

## Next

- [Get started overview](/docs/getting-started)
- [Sessions](/docs/sessions)
