---
title: Ink quick start
description: Run the same AgentsKit Chat definition in a terminal with Ink.
---

# Ink quick start

Terminal is a first-class surface — not a demotion of the web app.

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/ink ink react
```

## Shared definition

Reuse the same `defineChat` module as your web or mobile shell.

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

## Terminal shell

```tsx
import { render } from 'ink'
import { AgentChat } from '@agentskit/chat/ink'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

render(
  <AgentChat
    definition={createSupportChat(adapter)}
    placeholder="Ask about the product"
  />,
)
```

Semantic fallbacks keep interactive components usable without a graphical renderer. Keyboard flows
and PTY tests back the Ink path in this repository.

## Run the example

```bash
pnpm --filter @agentskit/chat-example-ink start
```

## Next

- [Get started overview](/docs/getting-started)
- [Components & fallbacks](/docs/components/catalog)
