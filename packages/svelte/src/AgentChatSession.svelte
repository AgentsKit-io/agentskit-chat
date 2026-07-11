<script lang="ts">
  import { ChatContainer, InputBar, Message, ThinkingIndicator, ToolConfirmation, type SvelteChatStore } from '@agentskit/svelte'
  import { decodeComponentFrame, isComponentFrameCandidate, type ComponentRenderFrame, type ComponentSelectionEvent } from '@agentskit/chat-protocol'
  import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame } from '@agentskit/chat'
  import type { ChatState, Message as ChatMessage } from '@agentskit/core'
  import type { AgentChatProps } from './types.js'
  import ChatBinding from './ChatBinding.svelte'
  import ChoiceList from './ChoiceList.svelte'
  import { toChatStyle } from './index.js'
  import { untrack } from 'svelte'

  let { definition, placeholder, onComponentSelect, actionConfirmationTtlMs, session: preparedSession, theme, container, message, input, thinking, confirmation: confirmationSnippet, choiceList }: AgentChatProps = $props()
  const initial = untrack(() => ({ definition, preparedSession, actionConfirmationTtlMs }))
  const session = resolveChatSession(initial.definition, initial.preparedSession)
  const sessionId = session.sessionId
  const initialChat = initial.definition.chat
  let activeChat = $state.raw(initialChat)
  let pendingChat = $state.raw(initialChat)
  let messages = $state<ChatMessage[]>(initialChat.initialMessages ?? [])
  let status = $state<ChatState['status']>('idle')
  let bindingRevision = $state(0)
  let currentStore: SvelteChatStore | undefined
  let actionError = $state<Error | undefined>()
  let editDraft = $state<{ messageId: string; content: string } | undefined>()
  let resolvedInstances = $state(new Set<string>())
  const coordinator = session.createConfirmation({
    ...(initial.actionConfirmationTtlMs === undefined ? {} : { ttlMs: initial.actionConfirmationTtlMs }),
    chat: { proposeToolCall: proposal => currentStore!.proposeToolCall(proposal), approve: id => currentStore!.approve(id), deny: (id, reason) => currentStore!.deny(id, reason) },
  })

  $effect(() => {
    pendingChat = definition.chat
    if (activeChat !== pendingChat) {
      if (status === 'streaming') currentStore?.stop()
      activeChat = pendingChat
      bindingRevision += 1
    }
  })

  function fail(error: unknown, fallback: string) { actionError = error instanceof Error ? error : new Error(fallback) }
  function selectComponent(event: ComponentSelectionEvent, frame: ComponentRenderFrame) {
    if (resolvedInstances.has(event.instanceId)) return
    actionError = undefined
    resolvedInstances.add(event.instanceId)
    try { onComponentSelect?.(event) } catch (error) { fail(error, 'Component selection callback failed.') }
    const action = resolveChoiceAction(frame, event.choiceId)
    if (action) void coordinator.propose(action).catch(error => { resolvedInstances.delete(event.instanceId); fail(error, 'Action proposal failed.') })
  }
  function approve(id: string) { const record = coordinator.getByToolCall(id); void (record ? coordinator.approve(record.token, sessionId) : currentStore!.approve(id)).catch(error => fail(error, 'Action approval failed.')) }
  function deny(id: string, reason?: string) { const record = coordinator.getByToolCall(id); void (record ? coordinator.reject(record.token, sessionId, reason) : currentStore!.deny(id, reason)).catch(error => fail(error, 'Action rejection failed.')) }
  function run(operation: Promise<void>) { actionError = undefined; void operation.catch(error => fail(error, 'Lifecycle operation failed.')) }
</script>

{#key bindingRevision}
  <ChatBinding config={session.updateChat({ ...activeChat, initialMessages: messages })} onState={(store, state) => {
    currentStore = store; messages = state.messages; status = state.status
  }}>
    {#snippet children(store, state)}
      {@const targets = getLifecycleTargets(state.messages)}
      {#snippet content()}
        {#each state.messages as item (item.id)}
          {@const candidate = item.role === 'assistant' && isComponentFrameCandidate(item.content)}
          {@const decoded = candidate ? decodeComponentFrame(item.content) : undefined}
          {#if decoded?.ok}
            {@const resolved = definition.components === undefined ? undefined : resolveChoiceListFrame(decoded.frame, definition.components)}
            {#if resolved?.ok}
              {#if choiceList}{@render choiceList(decoded.frame, definition.components!, resolvedInstances.has(decoded.frame.instanceId), event => selectComponent(event, decoded.frame))}
              {:else}<ChoiceList frame={decoded.frame} manifest={definition.components!} disabled={resolvedInstances.has(decoded.frame.instanceId)} onSelect={event => selectComponent(event, decoded.frame)} />{/if}
            {:else}<p data-ak-component-fallback>{formatSemanticFallback(decoded.frame.fallback)}</p>{/if}
          {:else if decoded && !decoded.ok}<p role="alert" data-ak-component-diagnostic={decoded.diagnostic.code}>{decoded.diagnostic.message}</p>
          {:else if message}{@render message(item)}
          {:else}<Message message={item} />{/if}
        {/each}
        {#each state.messages.flatMap(item => item.toolCalls ?? []) as toolCall (toolCall.id)}
          {#if confirmationSnippet}{@render confirmationSnippet(toolCall, approve, deny)}{:else}<ToolConfirmation {toolCall} onApprove={approve} onDeny={deny} />{/if}
        {/each}
        {#if thinking}{@render thinking(state.status === 'streaming')}{:else}<ThinkingIndicator visible={state.status === 'streaming'} />{/if}
      {/snippet}

      <section aria-label={`${definition.id} chat`} data-ak-app-chat style={theme === undefined ? undefined : toChatStyle(theme)}>
        <div aria-live="polite" aria-relevant="additions text" role="log">
          {#if container}{@render container(content)}{:else}<ChatContainer>{@render content()}</ChatContainer>{/if}
        </div>
        {#if state.error || actionError}<p role="alert" style:color={resolveChatTheme(theme).colors.danger}>{state.error?.message ?? actionError?.message}</p>{/if}
        {#if state.status === 'streaming'}<button type="button" onclick={store.stop}>Stop</button>{/if}
        {#if state.status !== 'streaming' && targets.userId}
          <div aria-label="Response actions">
            <button type="button" aria-label="Retry response" onclick={() => run(store.retry())}>Retry</button>
            {#if targets.assistantId}<button type="button" aria-label="Regenerate response" onclick={() => run(store.regenerate(targets.assistantId))}>Regenerate</button>{/if}
            <button type="button" onclick={() => editDraft = { messageId: targets.userId!, content: state.messages.find(item => item.id === targets.userId)?.content ?? '' }}>Edit last message</button>
            {#if editDraft}
              <form onsubmit={event => { event.preventDefault(); if (!editDraft?.content.trim()) return; run(store.edit(editDraft.messageId, editDraft.content)); editDraft = undefined }}>
                <label>Edit message<input aria-label="Edit message" value={editDraft.content} oninput={event => editDraft = { ...editDraft!, content: event.currentTarget.value }} /></label>
                <button type="submit" aria-label="Save edit">Save edit</button><button type="button" onclick={() => editDraft = undefined}>Cancel edit</button>
              </form>
            {/if}
          </div>
        {/if}
        {#if input}{@render input(store, state, placeholder)}{:else}<InputBar chat={{ ...state, ...store }} disabled={state.status === 'streaming'} {...(placeholder === undefined ? {} : { placeholder })} />{/if}
      </section>
    {/snippet}
  </ChatBinding>
{/key}
