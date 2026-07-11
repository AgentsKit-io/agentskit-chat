<script lang="ts">
  import type { AgentChatProps } from './types.js'
  import AgentChatSession from './AgentChatSession.svelte'

  let props: AgentChatProps = $props()
  const sessionKey = $derived(`${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`)
</script>

{#key sessionKey}
  <AgentChatSession {...props} />
{/key}
