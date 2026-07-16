# Vue quick start

Install the application shell and its native peers:

```bash
pnpm add @agentskit/chat @agentskit/chat/vue @agentskit/vue vue
```

Keep the chat definition in a framework-neutral module, then render it from Vue:

```vue
<script setup lang="ts">
import { AgentChat } from '@agentskit/chat/vue'
import { supportChat } from './support-chat'
</script>

<template>
  <AgentChat :definition="supportChat" placeholder="Ask about the product">
    <template #message="{ message }">
      <article :data-role="message.role">{{ message.content }}</article>
    </template>
  </AgentChat>
</template>
```

`AgentChat` delegates state, streaming, tools, confirmation, retry, editing, regeneration, and cancellation to `useChat` from `@agentskit/vue`. Named scoped slots customize the `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList` surfaces without entering the shared definition.

The default shell uses a polite log, semantic alerts, labeled controls, and native buttons/fieldset elements. A replacement slot owns equivalent accessibility semantics.

