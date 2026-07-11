<script lang="ts">
  import AgentChat from '../src/AgentChat.svelte'
  import type { ChatDefinition } from '@agentskit/chat'
  let { definition }: { definition: ChatDefinition } = $props()
</script>

<AgentChat {definition}>
  {#snippet container(children)}<main data-slot="container">{@render children()}</main>{/snippet}
  {#snippet message(item)}<p data-slot="message">{item.content}</p>{/snippet}
  {#snippet input()}<span data-slot="input">Custom input</span>{/snippet}
  {#snippet thinking(visible)}<i data-slot="thinking">{visible}</i>{/snippet}
  {#snippet confirmation()}<aside data-slot="confirmation">Confirmation</aside>{/snippet}
  {#snippet choiceList(_frame, _manifest, disabled)}<button data-slot="choice" {disabled}>Choice</button>{/snippet}
</AgentChat>
