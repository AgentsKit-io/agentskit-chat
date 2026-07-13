import { formatSemanticFallback, getLifecycleTargets, presentChatMessage, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, resolveComponentFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat-protocol'
import { ChatContainer, InputBar, Message, ThinkingIndicator, ToolConfirmation, useChat } from '@agentskit/solid'
import type { ChatReturn, Message as ChatMessage, ToolCall } from '@agentskit/core'
import { For, Show, createEffect, createMemo, createSignal, on, untrack, type JSX } from 'solid-js'
import { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

export { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

export type ChatCssVariables = JSX.CSSProperties & { readonly [key: `--ak-${string}`]: string | number }
export const toChatCssVariables = (input?: ChatThemeInput): ChatCssVariables => {
  const theme = resolveChatTheme(input)
  return {
    '--ak-color-bg': theme.colors.background, '--ak-color-surface': theme.colors.surface, '--ak-color-border': theme.colors.border,
    '--ak-color-text': theme.colors.text, '--ak-color-text-muted': theme.colors.muted, '--ak-color-bubble-user': theme.colors.accent,
    '--ak-color-bubble-user-text': theme.colors.onAccent, '--ak-color-bubble-assistant': theme.colors.surface, '--ak-color-bubble-assistant-text': theme.colors.text,
    '--ak-color-input-bg': theme.colors.background, '--ak-color-input-border': theme.colors.border, '--ak-color-input-focus': theme.colors.accent,
    '--ak-color-button': theme.colors.accent, '--ak-color-button-text': theme.colors.onAccent, '--ak-color-tool-bg': theme.colors.surface,
    '--ak-color-tool-border': theme.colors.border, '--ak-app-color-danger': theme.colors.danger,
    '--ak-font-family': theme.fontFamily === 'system' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : theme.fontFamily,
    '--ak-radius': `${theme.radius.medium}px`, '--ak-radius-lg': `${theme.radius.large}px`, '--ak-spacing-sm': `${theme.spacing.small}px`,
    '--ak-spacing-md': `${theme.spacing.medium}px`, '--ak-spacing-lg': `${theme.spacing.large}px`,
  }
}

export interface ChoiceListProps { readonly frame: unknown; readonly manifest: ComponentManifest; readonly onSelect: (event: ComponentSelectionEvent) => void; readonly disabled?: boolean }
export function ChoiceList(props: ChoiceListProps): JSX.Element {
  const resolved = createMemo(() => resolveChoiceListFrame(props.frame, props.manifest))
  return <Show when={resolved().ok ? resolved() : undefined}>{value => {
    const item = value() as Extract<ReturnType<typeof resolveChoiceListFrame>, { ok: true }>
    return <fieldset aria-label={item.props.prompt} data-ak-component="choice-list"><legend>{item.props.prompt}</legend><For each={item.props.choices}>{choice =>
      <button type="button" disabled={props.disabled} onClick={() => props.onSelect(selectChoice(item.frame, choice.id))}><span>{choice.label}</span><Show when={choice.description}>{description => <small>{description()}</small>}</Show></button>
    }</For></fieldset>
  }}</Show>
}

export interface AgentChatProps {
  readonly definition: ChatDefinition; readonly placeholder?: string; readonly onComponentSelect?: (event: ComponentSelectionEvent) => void; readonly onComponentInteract?: (event: ComponentInteractionEvent) => void
  readonly actionConfirmationTtlMs?: number; readonly session?: ChatSession; readonly theme?: ChatThemeInput
  readonly container?: (children: JSX.Element) => JSX.Element; readonly message?: (message: ChatMessage) => JSX.Element
  readonly input?: (chat: ChatReturn, disabled: boolean, placeholder?: string) => JSX.Element; readonly thinking?: (visible: boolean) => JSX.Element
  readonly confirmation?: (toolCall: ToolCall, approve: (id: string) => void, deny: (id: string, reason?: string) => void) => JSX.Element
  readonly choiceList?: (props: ChoiceListProps) => JSX.Element
  readonly standardComponent?: (props: StandardComponentProps) => JSX.Element
}

function ChatBinding(props: { readonly config: ChatDefinition['chat']; readonly onState: (chat: ChatReturn) => void; readonly children: (chat: ChatReturn) => JSX.Element }): JSX.Element {
  const chat = useChat(props.config)
  createEffect(() => { void chat.status; void chat.messages; props.onState(chat) })
  return props.children(chat)
}

function AgentChatSession(props: AgentChatProps): JSX.Element {
  const initial = untrack(() => ({ definition: props.definition, session: props.session, ttl: props.actionConfirmationTtlMs }))
  const session = resolveChatSession(initial.definition, initial.session)
  const sessionId = session.sessionId
  const [activeChat, setActiveChat] = createSignal(initial.definition.chat)
  let messages = initial.definition.chat.initialMessages ?? []
  const [actionError, setActionError] = createSignal<Error>()
  const [editDraft, setEditDraft] = createSignal<{ readonly messageId: string; readonly content: string }>()
  const [resolvedInstances, setResolvedInstances] = createSignal(new Set<string>())
  let currentChat: ChatReturn | undefined
  const coordinator = session.createConfirmation({
    ...(initial.ttl === undefined ? {} : { ttlMs: initial.ttl }),
    chat: { proposeToolCall: proposal => currentChat!.proposeToolCall(proposal), approve: id => currentChat!.approve(id), deny: (id, reason) => currentChat!.deny(id, reason) },
  })
  createEffect(on(() => props.definition.chat, next => setActiveChat(() => next), { defer: true }))
  const fail = (error: unknown, fallback: string): void => { setActionError(error instanceof Error ? error : new Error(fallback)) }
  const selectComponent = (event: ComponentSelectionEvent, frame: ComponentRenderFrame): void => {
    if (resolvedInstances().has(event.instanceId)) return
    setActionError(); setResolvedInstances(current => new Set(current).add(event.instanceId))
    try { props.onComponentSelect?.(event) } catch (error) { fail(error, 'Component selection callback failed.') }
    const action = resolveChoiceAction(frame, event.choiceId)
    if (action) void coordinator.propose(action).catch(error => { setResolvedInstances(current => { const next = new Set(current); next.delete(event.instanceId); return next }); fail(error, 'Action proposal failed.') })
    else {
      let submission
      try { submission = props.definition.choiceSubmission?.(frame, event.choiceId, { sessionId }) } catch (error) {
        setResolvedInstances(current => { const next = new Set(current); next.delete(event.instanceId); return next })
        fail(error, 'Choice submission authorization failed.')
        return
      }
      if (submission && 'unavailable' in submission) {
        setResolvedInstances(current => { const next = new Set(current); next.delete(event.instanceId); return next })
        fail(new Error('This deterministic choice expired. Ask the question again.'), 'Choice unavailable.')
        return
      }
      if (submission) void currentChat!.send(submission.value).then(
        () => { try { submission.commit() } catch (error) { fail(error, 'Choice submission settlement failed.') } },
        error => {
          try { submission.release() } catch { /* settlement isolation */ }
          finally { setResolvedInstances(current => { const next = new Set(current); next.delete(event.instanceId); return next }) }
          fail(error, 'Choice submission failed.')
        },
      )
    }
  }
  const interactComponent = (event: ComponentInteractionEvent): void => {
    if (resolvedInstances().has(event.instanceId)) return
    setResolvedInstances(current => new Set(current).add(event.instanceId))
    try { props.onComponentInteract?.(event) } catch (error) { setResolvedInstances(current => { const next = new Set(current); next.delete(event.instanceId); return next }); fail(error, 'Component interaction callback failed.') }
  }
  const approve = (id: string): void => { const record = coordinator.getByToolCall(id); void (record ? coordinator.approve(record.token, sessionId) : currentChat!.approve(id)).catch(error => fail(error, 'Action approval failed.')) }
  const deny = (id: string, reason?: string): void => { const record = coordinator.getByToolCall(id); void (record ? coordinator.reject(record.token, sessionId, reason) : currentChat!.deny(id, reason)).catch(error => fail(error, 'Action rejection failed.')) }
  const run = (operation: Promise<void>): void => { setActionError(); void operation.catch(error => fail(error, 'Lifecycle operation failed.')) }

  const renderMessage = (item: ChatMessage): JSX.Element => {
    const rendered = createMemo<JSX.Element>(() => <For each={presentChatMessage(item)}>{presentation => {
      if (presentation.kind === 'component') {
        const resolved = props.definition.components === undefined ? undefined : resolveComponentFrame(presentation.frame, props.definition.components)
        if (resolved?.ok) {
          if (presentation.frame.componentKey === 'choice-list') {
            const choiceProps: ChoiceListProps = { frame: presentation.frame, manifest: props.definition.components!, get disabled() { return resolvedInstances().has(presentation.frame.instanceId) }, onSelect: (event: ComponentSelectionEvent) => selectComponent(event, presentation.frame) }
            return props.choiceList?.(choiceProps) ?? <ChoiceList frame={choiceProps.frame} manifest={choiceProps.manifest} disabled={resolvedInstances().has(presentation.frame.instanceId)} onSelect={choiceProps.onSelect} />
          }
          const standardProps: StandardComponentProps = { frame: presentation.frame, manifest: props.definition.components!, get disabled() { return resolvedInstances().has(presentation.frame.instanceId) }, onInteract: interactComponent }
          return props.standardComponent?.(standardProps) ?? <StandardComponent {...standardProps} />
        }
        return <p data-ak-component-fallback>{formatSemanticFallback(presentation.frame.fallback)}</p>
      }
      if (presentation.kind === 'diagnostic') return <p role="alert" data-ak-component-diagnostic={presentation.code}>{presentation.message}</p>
      return props.message?.(presentation.message) ?? <Message message={presentation.message} />
    }}</For>)
    return rendered as unknown as JSX.Element
  }

  const renderChat = (chat: ChatReturn): JSX.Element => {
    currentChat = chat
    const targets = createMemo(() => getLifecycleTargets(chat.messages))
    const content = <><For each={chat.messages}>{renderMessage}</For><For each={chat.messages.flatMap(item => item.toolCalls ?? [])}>{toolCall => props.confirmation?.(toolCall, approve, deny) ?? <ToolConfirmation toolCall={toolCall} onApprove={approve} onDeny={deny} />}</For>{props.thinking?.(chat.status === 'streaming') ?? <ThinkingIndicator visible={chat.status === 'streaming'} />}</>
    return <section aria-label={`${props.definition.id} chat`} data-ak-app-chat style={props.theme === undefined ? undefined : toChatCssVariables(props.theme)}>
      <div aria-live="polite" aria-relevant="additions text" role="log">{props.container?.(content) ?? <ChatContainer>{content}</ChatContainer>}</div>
      <Show when={chat.error ?? actionError()}>{error => <p role="alert" style={{ color: resolveChatTheme(props.theme).colors.danger }}>{error().message}</p>}</Show>
      <Show when={chat.status === 'streaming'}><button type="button" onClick={chat.stop}>Stop</button></Show>
      <Show when={chat.status !== 'streaming' && targets().userId}><div aria-label="Response actions">
        <button type="button" aria-label="Retry response" onClick={() => run(chat.retry())}>Retry</button>
        <Show when={targets().assistantId}>{assistantId => <button type="button" aria-label="Regenerate response" onClick={() => run(chat.regenerate(assistantId()))}>Regenerate</button>}</Show>
        <button type="button" onClick={() => { const id = targets().userId!; setEditDraft({ messageId: id, content: chat.messages.find(item => item.id === id)?.content ?? '' }) }}>Edit last message</button>
        <Show when={editDraft()}>{draft => <form onSubmit={event => { event.preventDefault(); if (!draft().content.trim()) return; run(chat.edit(draft().messageId, draft().content)); setEditDraft() }}>
          <label>Edit message<input aria-label="Edit message" value={draft().content} onInput={event => setEditDraft({ ...draft(), content: event.currentTarget.value })} /></label>
          <button type="submit" aria-label="Save edit">Save edit</button><button type="button" onClick={() => setEditDraft()}>Cancel edit</button>
        </form>}</Show>
      </div></Show>
      {props.input?.(chat, chat.status === 'streaming', props.placeholder) ?? <InputBar chat={chat} disabled={chat.status === 'streaming'} {...(props.placeholder === undefined ? {} : { placeholder: props.placeholder })} />}
    </section>
  }

  return <Show keyed when={activeChat()}>{config => <ChatBinding config={session.updateChat({ ...config, initialMessages: messages })} onState={chat => {
    currentChat = chat
    messages = chat.messages
  }}>{renderChat}</ChatBinding>}</Show>
}

export function AgentChat(props: AgentChatProps): JSX.Element {
  const key = createMemo(() => `${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`)
  return <Show keyed when={key()}>{_key => <AgentChatSession {...props} />}</Show>
}

export type { ChatDefinition } from '@agentskit/chat'
