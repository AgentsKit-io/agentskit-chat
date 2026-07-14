import { ApprovalRequestPropsSchema, ButtonGroupPropsSchema, ConfirmationPropsSchema, ErrorNoticePropsSchema, FileAttachmentPropsSchema, FormPropsSchema, LinkCardPropsSchema, ProgressPropsSchema, SourceListPropsSchema, STANDARD_COMPONENT_KEYS, TablePropsSchema, ToolCallPropsSchema, createComponentInteraction, formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, resolveComponentFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatTheme, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import { decodeAssistantContent, decodeComponentFrame, isAssistantContentCandidate, isComponentFrameCandidate } from '@agentskit/chat/protocol'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat/protocol'
import type { AssistantContentPart } from '@agentskit/chat/protocol'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  ToolConfirmation,
  useChat,
} from '@agentskit/react'
import { useMemo, useRef, useState, type ChangeEvent, type ComponentProps, type ComponentType, type CSSProperties, type ReactElement } from 'react'

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
    '--ak-font-family': theme.fontFamily === 'system' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : theme.fontFamily,
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
  readonly StandardComponent?: ComponentType<StandardComponentProps>
}

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly onComponentInteract?: (event: ComponentInteractionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
  readonly theme?: ChatThemeInput
  readonly slots?: AgentChatSlots
}

export interface StandardComponentProps {
  readonly frame: ComponentRenderFrame
  readonly manifest: ComponentManifest
  readonly onInteract: (event: ComponentInteractionEvent) => void
  readonly disabled?: boolean
  readonly allowNativeNavigation?: boolean
}

const coalesceTextParts = (parts: readonly AssistantContentPart[]): readonly AssistantContentPart[] => {
  const result: AssistantContentPart[] = []
  for (const part of parts) {
    const previous = result.at(-1)
    if (part.kind === 'text' && previous?.kind === 'text') result[result.length - 1] = { kind: 'text', text: previous.text + part.text }
    else result.push(part)
  }
  return result
}

const StandardForm = ({ frame, manifest, onInteract, disabled }: StandardComponentProps): ReactElement => {
  const props = FormPropsSchema.parse(frame.props)
  const [values, setValues] = useState<Readonly<Record<string, string | boolean>>>({})
  return <form aria-label={props.title ?? 'Form'} data-ak-component="form" onSubmit={event => { event.preventDefault(); onInteract(createComponentInteraction(frame, manifest, 'submit', values)) }}>
    {props.title ? <h3>{props.title}</h3> : null}
    {props.fields.map(field => <label key={field.id}>{field.label}{field.type === 'select'
      ? <select required={field.required} disabled={disabled} value={String(values[field.id] ?? '')} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))}><option value="">Select</option>{field.options?.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
      : <input type={field.type} required={field.required} disabled={disabled} placeholder={field.placeholder} {...(field.type === 'checkbox' ? { checked: Boolean(values[field.id]), onChange: (event: ChangeEvent<HTMLInputElement>) => setValues(current => ({ ...current, [field.id]: event.target.checked })) } : { value: String(values[field.id] ?? ''), onChange: (event: ChangeEvent<HTMLInputElement>) => setValues(current => ({ ...current, [field.id]: event.target.value })) })} />}</label>)}
    <button type="submit" disabled={disabled}>{props.submitLabel}</button>
  </form>
}

export const StandardComponent = ({ frame, manifest, onInteract, disabled = false, allowNativeNavigation = false }: StandardComponentProps): ReactElement | null => {
  if (!resolveComponentFrame(frame, manifest).ok || frame.componentKey === 'choice-list') return null
  const emit = (event: string, value?: unknown): void => onInteract(createComponentInteraction(frame, manifest, event, value))
  switch (frame.componentKey) {
    case 'button-group': { const props = ButtonGroupPropsSchema.parse(frame.props); return <fieldset aria-label={props.label} data-ak-component="button-group"><legend>{props.label}</legend>{props.buttons.map(button => <button key={button.id} type="button" disabled={disabled || button.disabled} onClick={() => emit('select', button.id)}>{button.label}</button>)}</fieldset> }
    case 'form': return <StandardForm frame={frame} manifest={manifest} onInteract={onInteract} disabled={disabled} />
    case 'confirmation': { const props = ConfirmationPropsSchema.parse(frame.props); return <section aria-label={props.title} data-ak-component="confirmation"><h3>{props.title}</h3><p>{props.message}</p><button type="button" disabled={disabled} onClick={() => emit('confirm')}>{props.confirmLabel}</button><button type="button" disabled={disabled} onClick={() => emit('cancel')}>{props.cancelLabel}</button></section> }
    case 'progress': { const props = ProgressPropsSchema.parse(frame.props); return <div data-ak-component="progress"><label>{props.label}<progress max={100} value={props.value} /></label>{props.status ? <p>{props.status}</p> : null}</div> }
    case 'source-list': { const props = SourceListPropsSchema.parse(frame.props); return <section data-ak-component="source-list"><h3>{props.label}</h3><ul>{props.sources.map(source => <li key={source.id}>{source.url ? <a href={source.url} onClick={event => { if (!allowNativeNavigation) event.preventDefault(); emit('open', source.id) }}>{source.title}</a> : source.title}{source.snippet ? <p>{source.snippet}</p> : null}</li>)}</ul></section> }
    case 'link-card': { const props = LinkCardPropsSchema.parse(frame.props); return <a data-ak-component="link-card" href={props.href} onClick={event => { event.preventDefault(); emit('open', props.href) }}><strong>{props.title}</strong>{props.description ? <span>{props.description}</span> : null}{props.label ? <span>{props.label}</span> : null}</a> }
    case 'error-notice': { const props = ErrorNoticePropsSchema.parse(frame.props); return <section role="alert" data-ak-component="error-notice"><strong>{props.title}</strong><p>{props.message}</p>{props.code ? <code>{props.code}</code> : null}{props.retryLabel ? <button type="button" disabled={disabled} onClick={() => emit('retry')}>{props.retryLabel}</button> : null}</section> }
    case 'tool-call': { const props = ToolCallPropsSchema.parse(frame.props); return <section role="status" data-ak-component="tool-call"><strong>{props.name}</strong><span>{props.status}</span>{props.arguments ? <pre>{JSON.stringify(props.arguments, null, 2)}</pre> : null}{props.result === undefined ? null : <pre>{JSON.stringify(props.result, null, 2)}</pre>}</section> }
    case 'approval-request': { const props = ApprovalRequestPropsSchema.parse(frame.props); return <section aria-label={props.title} data-ak-component="approval-request"><h3>{props.title}</h3><p>{props.description}</p><button type="button" disabled={disabled} onClick={() => emit('approve')}>{props.approveLabel}</button><button type="button" disabled={disabled} onClick={() => emit('deny')}>{props.denyLabel}</button></section> }
    case 'table': { const props = TablePropsSchema.parse(frame.props); return <table data-ak-component="table"><caption>{props.caption}</caption><thead><tr>{props.columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{props.rows.map((row, index) => <tr key={index}>{props.columns.map(column => <td key={column.key}>{String(row[column.key] ?? '')}</td>)}</tr>)}</tbody></table> }
    case 'file-attachment': { const props = FileAttachmentPropsSchema.parse(frame.props); return <article data-ak-component="file-attachment"><strong>{props.name}</strong><span>{props.mimeType}</span>{props.sizeBytes === undefined ? null : <span>{props.sizeBytes} bytes</span>}{props.url ? <a href={props.url} onClick={event => { event.preventDefault(); emit('open', props.url) }}>Open</a> : null}</article> }
    default: return null
  }
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

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined, onComponentInteract, actionConfirmationTtlMs, session: preparedSession, theme: themeInput, slots = {} }: AgentChatProps): ReactElement => {
  const theme: ChatTheme = resolveChatTheme(themeInput)
  const ContainerSlot = slots.Container ?? ChatContainer
  const MessageSlot = slots.Message ?? Message
  const InputSlot = slots.Input ?? InputBar
  const ThinkingSlot = slots.Thinking ?? ThinkingIndicator
  const ConfirmationSlot = slots.Confirmation ?? ToolConfirmation
  const ChoiceListSlot = slots.ChoiceList ?? ChoiceList
  const StandardComponentSlot = slots.StandardComponent ?? StandardComponent
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
  const selectComponent = (event: ComponentSelectionEvent, frame: ComponentRenderFrame): void => {
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
    else {
      let submission
      try { submission = definition.choiceSubmission?.(frame, event.choiceId, { sessionId }) } catch (error) {
        resolvedInstancesRef.current.delete(event.instanceId)
        setResolvedInstances(new Set(resolvedInstancesRef.current))
        setActionError(error instanceof Error ? error : new Error('Choice submission authorization failed.'))
        return
      }
      if (submission && 'unavailable' in submission) {
        resolvedInstancesRef.current.delete(event.instanceId)
        setResolvedInstances(new Set(resolvedInstancesRef.current))
        setActionError(new Error('This deterministic choice expired. Select it again after asking the question once more.'))
        return
      }
      if (submission) void chatRef.current.send(submission.value).then(
        () => { try { submission.commit() } catch (error) { setActionError(error instanceof Error ? error : new Error('Choice submission settlement failed.')) } },
        error => {
          try { submission.release() } catch { /* settlement isolation */ }
          finally { resolvedInstancesRef.current.delete(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current)) }
          setActionError(error instanceof Error ? error : new Error('Choice submission failed.'))
        },
      )
    }
  }
  const interactComponent = (event: ComponentInteractionEvent): void => {
    if (resolvedInstancesRef.current.has(event.instanceId)) return
    resolvedInstancesRef.current.add(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current))
    try { onComponentInteract?.(event) } catch (error) { resolvedInstancesRef.current.delete(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current)); setActionError(error instanceof Error ? error : new Error('Component interaction callback failed.')) }
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
  const renderFrame = (frame: ComponentRenderFrame, key: string): ReactElement => {
    const manifest = definition.components
    const resolved = manifest === undefined ? undefined : resolveComponentFrame(frame, manifest)
    if (resolved?.ok && slots.StandardComponent === undefined && !STANDARD_COMPONENT_KEYS.includes(frame.componentKey as typeof STANDARD_COMPONENT_KEYS[number])) {
      return <p key={key} data-ak-component-fallback="">{formatSemanticFallback(frame.fallback)}</p>
    }
    if (resolved?.ok) return frame.componentKey === 'choice-list'
      ? <ChoiceListSlot key={key} frame={frame} manifest={manifest!} disabled={resolvedInstances.has(frame.instanceId)} onSelect={event => selectComponent(event, frame)} />
      : <StandardComponentSlot key={key} frame={frame} manifest={manifest!} disabled={resolvedInstances.has(frame.instanceId)} allowNativeNavigation={onComponentInteract === undefined} onInteract={interactComponent} />
    return <p key={key} data-ak-component-fallback="">{formatSemanticFallback(frame.fallback)}</p>
  }

  return (
    <section aria-label={`${definition.id} chat`} data-ak-app-chat="" style={themeInput === undefined ? undefined : toChatCssVariables(theme)}>
      <div aria-live="polite" aria-relevant="additions text" role="log">
        <ContainerSlot>
          {chat.messages.map(message => {
            const contentCandidate = message.role === 'assistant' && isAssistantContentCandidate(message.content)
            const content = contentCandidate ? decodeAssistantContent(message.content) : undefined
            if (content?.ok) return <div key={message.id} data-ak-assistant-content="">{coalesceTextParts(content.parts).map((part, index) => part.kind === 'text'
              ? <MessageSlot key={`${message.id}:text:${index}`} message={{ ...message, content: part.text }} />
              : renderFrame(part.frame, `${message.id}:component:${index}`))}</div>
            if (content && !content.ok) return <p key={message.id} role="alert" data-ak-component-diagnostic={content.diagnostic.code}>{content.diagnostic.message}</p>
            const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
            const decoded = candidate ? decodeComponentFrame(message.content) : undefined
            if (decoded?.ok) {
              return renderFrame(decoded.frame, message.id)
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
