---
title: Svelte quick start
description: Render an AgentsKit Chat definition with the native Svelte 5 shell.
---

# Svelte quick start

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/svelte svelte
```

## Shell

```svelte
<script lang="ts">
  import { AgentChat } from '@agentskit/chat/svelte'
  import { createSupportChat } from './support-chat'
  import { adapter } from './adapter'

  const definition = createSupportChat(adapter)
</script>

<AgentChat {definition} placeholder="Ask about the product">
  {#snippet message(item)}
    <article data-role={item.role}>{item.content}</article>
  {/snippet}
</AgentChat>
```

The shell delegates streaming, tools, confirmation, retry, editing, regeneration, and cancellation
to `createChatStore` from `@agentskit/svelte`. Typed Svelte 5 snippets customize native surfaces
without entering the shared definition.

## Next

- [Get started overview](/docs/getting-started)
