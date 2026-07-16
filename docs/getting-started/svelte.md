# Svelte quick start

```bash
pnpm add @agentskit/chat @agentskit/chat/svelte @agentskit/svelte svelte
```

```svelte
<script lang="ts">
  import { AgentChat } from '@agentskit/chat/svelte'
  import { supportChat } from './support-chat'
</script>

<AgentChat definition={supportChat} placeholder="Ask about the product">
  {#snippet message(item)}
    <article data-role={item.role}>{item.content}</article>
  {/snippet}
</AgentChat>
```

The shell delegates streaming, tools, confirmation, retry, editing, regeneration, and cancellation to `createChatStore` from `@agentskit/svelte`. Typed Svelte 5 snippets customize native surfaces without entering the shared definition.

