---
title: Vue quick start
description: Render an AgentsKit Chat definition with the native Vue shell.
---

# Vue quick start

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/vue vue
```

## Shared definition

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

## Vue shell

```vue
<script setup lang="ts">
import { AgentChat } from '@agentskit/chat/vue'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

const definition = createSupportChat(adapter)
</script>

<template>
  <AgentChat :definition="definition" placeholder="Ask about the product">
    <template #message="{ message }">
      <article :data-role="message.role">{{ message.content }}</article>
    </template>
  </AgentChat>
</template>
```

`AgentChat` delegates state, streaming, tools, confirmation, retry, editing, regeneration, and
cancellation to `useChat` from `@agentskit/vue`. Named scoped slots customize `container`,
`message`, `input`, `thinking`, `confirmation`, and `choiceList` without entering the shared
definition.

## Next

- [Get started overview](/docs/getting-started)
- [Other renderers](/docs/getting-started)
