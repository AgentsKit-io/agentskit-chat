<script lang="ts">
  import type { ChatConfig, ChatState } from '@agentskit/core'
  import { createChatStore, type SvelteChatStore } from '@agentskit/svelte'
  import { onDestroy, untrack, type Snippet } from 'svelte'

  let { config, onState, children }: { config: ChatConfig; onState: (store: SvelteChatStore, state: ChatState) => void; children: Snippet<[SvelteChatStore, ChatState]> } = $props()
  const store = createChatStore(untrack(() => config))
  let state = $state<ChatState>({ messages: [], status: 'idle', input: '', error: null, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } })
  const unsubscribe = store.subscribe(value => { state = value; onState(store, value) })
  onDestroy(() => { unsubscribe(); store.destroy() })
</script>

{@render children(store, state)}
