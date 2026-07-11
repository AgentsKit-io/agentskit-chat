import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatTheme, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentSelectionEvent } from '@agentskit/chat-protocol'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  ToolConfirmation,
  useChat,
} from '@agentskit/react'
import { useMemo, useRef, useState, type ComponentProps, type ComponentType, type CSSProperties, type ReactElement } from 'react'

export type ChatCssVariables = CSSProperties & { readonly [key: `--ak-${string}`]: string | number }

export const toChatCssVariables = (input?: ChatThemeInput): ChatCssVariables => {
  const theme = resolveChatTheme(input)
  return {
    '--ak-color-bg': theme.colors.background,
    '--ak-color-surface': theme.colors.surface,
    '--ak-color-border': theme.colors.border,
    '--ak-color-text': theme.colors.text,
    '--ak-color-text-muted': theme.colors.muted,
    '--ak-color-bubble-user': theme.colors.accent,
    '--ak-color-bubble-user-text': theme.colors.onAccent,
    '--ak-color-bubble-assistant': theme.colors.surface,
    '--ak-color-bubble-assistant-text': theme.colors.text,
    '--ak-color-input-bg': theme.colors.background,
    '--ak-color-input-border': theme.colors.border,
    '--ak-color-input-focus': theme.colors.accent,
    '--ak-color-button': theme.colors.accent,
    '--ak-color-button-text': theme.colors.onAccent,
    '--ak-color-tool-bg': theme.colors.surface,
    '--ak-color-tool-border': theme.colors.border,
    '--ak-app-color-danger': theme.colors.danger,
    '--ak-font-family': theme.fontFamily,
    '--ak-radius': `${theme.radius.medium}px`,
    '--ak-radius-lg': `${theme.radius.large}px`,
    '--ak-spacing-sm': `${theme.spacing.small}px`,
    '--ak-spacing-md': `${theme.spacing.medium}px`,
    '--ak-spacing-lg': `${theme.spacing.large}px`,
  }
}

export interface AgentChatSlots {
  readonly Container?: ComponentType<ComponentProps<typeof ChatContainer>>
  readonly Message?: ComponentType<ComponentProps<typeof Message>>
  readonly Input?: ComponentType<ComponentProps<typeof InputBar>>
  readonly Thinking?: ComponentType<ComponentProps<typeof ThinkingIndicator>>
  readonly Confirmation?: ComponentType<ComponentProps<typeof ToolConfirmation>>
  readonly ChoiceList?: ComponentType<ChoiceListProps>
}

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
  readonly theme?: ChatThemeInput
  readonly slots?: AgentChatSlots
}

export interface ChoiceListProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly disabled?: boolean
}

export const ChoiceList = ({ frame, manifest, onSelect, disabled = false }: ChoiceListProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  if (!resolved.ok) return null
  return (
    <fieldset aria-label={resolved.props.prompt} data-ak-component="choice-list">
      <legend>{resolved.props.prompt}</legend>
      {resolved.props.choices.map(choice => (
        <button key={choice.id} type="button" disabled={disabled} onClick={() => onSelect(selectChoice(resolved.frame, choice.id))}>
          <span>{choice.label}</span>
          {choice.description === undefined ? null : <small>{choice.description}</small>}
        </button>
      ))}
    </fieldset>
  )
}

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs, session: preparedSession, theme: themeInput, slots = {} }: AgentChatProps): ReactElement => {
  const theme: ChatTheme = resolveChatTheme(themeInput)
  const ContainerSlot = slots.Container ?? ChatContainer
  const MessageSlot = slots.Message ?? Message
  const InputSlot = slots.Input ?? InputBar
  const ThinkingSlot = slots.Thinking ?? ThinkingIndicator
  const ConfirmationSlot = slots.Confirmation ?? ToolConfirmation
  const ChoiceListSlot = slots.ChoiceList ?? ChoiceList
  const [session] = useState(() => resolveChatSession(definition, preparedSession))
  const sessionId = session.sessionId
  const [actionError, setActionError] = useState<Error | undefined>()
  const [editDraft, setEditDraft] = useState<{ readonly messageId: string, readonly content: string }>()
  const [resolvedInstances, setResolvedInstances] = useState<ReadonlySet<string>>(() => new Set())
  const resolvedInstancesRef = useRef(new Set<string>())
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)
  const chatRef = useRef(chat)
  chatRef.current = chat
  const [confirmation] = useState(() => session.createConfirmation({ ...(actionConfirmationTtlMs === undefined ? {} : { ttlMs: actionConfirmationTtlMs }), chat: {
    proposeToolCall: proposal => chatRef.current.proposeToolCall(proposal),
    approve: id => chatRef.current.approve(id),
    deny: (id, reason) => chatRef.current.deny(id, reason),
  } }))
  const selectComponent = (event: ComponentSelectionEvent, frame: import('@agentskit/chat-protocol').ComponentRenderFrame): void => {
    if (resolvedInstancesRef.current.has(event.instanceId)) return
    setActionError(undefined)
    resolvedInstancesRef.current.add(event.instanceId)
    setResolvedInstances(new Set(resolvedInstancesRef.current))
    try { onComponentSelect(event) } catch (error) {
      setActionError(error instanceof Error ? error : new Error('Component selection callback failed.'))
    }
    const action = resolveChoiceAction(frame, event.choiceId)
    if (action) void confirmation.propose(action).catch(error => {
      resolvedInstancesRef.current.delete(event.instanceId)
      setResolvedInstances(new Set(resolvedInstancesRef.current))
      setActionError(error instanceof Error ? error : new Error('Action proposal failed.'))
    })
  }
  const approve = (toolCallId: string): void => {
    const record = confirmation.getByToolCall(toolCallId)
    void (record ? confirmation.approve(record.token, sessionId) : chat.approve(toolCallId)).catch(error => setActionError(error instanceof Error ? error : new Error('Action approval failed.')))
  }
  const deny = (toolCallId: string, reason?: string): void => {
    const record = confirmation.getByToolCall(toolCallId)
    void (record ? confirmation.reject(record.token, sessionId, reason) : chat.deny(toolCallId, reason)).catch(error => setActionError(error instanceof Error ? error : new Error('Action rejection failed.')))
  }
  const targets = getLifecycleTargets(chat.messages)
  const runLifecycle = (operation: Promise<void>): void => {
    setActionError(undefined)
    void operation.catch(error => setActionError(error instanceof Error ? error : new Error('Lifecycle operation failed.')))
  }

  return (
    <section aria-label={`${definition.id} chat`} data-ak-app-chat="" style={themeInput === undefined ? undefined : toChatCssVariables(theme)}>
      <div aria-live="polite" aria-relevant="additions text" role="log">
        <ContainerSlot>
          {chat.messages.map(message => {
            const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
            const decoded = candidate ? decodeComponentFrame(message.content) : undefined
            if (decoded?.ok) {
              const resolved = definition.components === undefined
                ? undefined
                : resolveChoiceListFrame(decoded.frame, definition.components)
              return resolved?.ok
                ? <ChoiceListSlot key={message.id} frame={decoded.frame} manifest={definition.components!} disabled={resolvedInstances.has(decoded.frame.instanceId)} onSelect={event => selectComponent(event, decoded.frame)} />
                : <p key={message.id} data-ak-component-fallback="">{formatSemanticFallback(decoded.frame.fallback)}</p>
            }
            if (decoded && !decoded.ok) return <p key={message.id} role="alert" data-ak-component-diagnostic={decoded.diagnostic.code}>{decoded.diagnostic.message}</p>
            return <MessageSlot key={message.id} message={message} />
          })}
          {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
            <ConfirmationSlot key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
          ))}
          <ThinkingSlot visible={chat.status === 'streaming'} />
        </ContainerSlot>
      </div>
      {chat.error || actionError ? <p role="alert" style={{ color: theme.colors.danger }}>{chat.error?.message ?? actionError?.message}</p> : null}
      {chat.status === 'streaming' ? <button type="button" onClick={chat.stop}>Stop</button> : null}
      {chat.status !== 'streaming' && targets.userId ? (
        <div aria-label="Response actions">
          <button type="button" aria-label="Retry response" onClick={() => runLifecycle(chat.retry())}>Retry</button>
          {targets.assistantId ? <button type="button" aria-label="Regenerate response" onClick={() => runLifecycle(chat.regenerate(targets.assistantId))}>Regenerate</button> : null}
          <button type="button" onClick={() => setEditDraft({ messageId: targets.userId!, content: chat.messages.find(message => message.id === targets.userId)?.content ?? '' })}>Edit last message</button>
          {editDraft === undefined ? null : (
            <form onSubmit={event => {
              event.preventDefault()
              if (editDraft.content.trim() === '') return
              runLifecycle(chat.edit(editDraft.messageId, editDraft.content))
              setEditDraft(undefined)
            }}>
              <label>Edit message<input aria-label="Edit message" value={editDraft.content} onChange={event => setEditDraft({ ...editDraft, content: event.target.value })} /></label>
              <button type="submit" aria-label="Save edit">Save edit</button>
              <button type="button" onClick={() => setEditDraft(undefined)}>Cancel edit</button>
            </form>
          )}
        </div>
      ) : null}
      <InputSlot
        chat={chat}
        disabled={chat.status === 'streaming'}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
    </section>
  )
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <AgentChatSession key={`${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
