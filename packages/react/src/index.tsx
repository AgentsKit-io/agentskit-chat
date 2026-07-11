import { createActionConfirmation, createChatSession, formatSemanticFallback, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ComponentManifest } from '@agentskit/chat'
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
import { useMemo, useRef, useState, type ReactElement } from 'react'

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
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

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs }: AgentChatProps): ReactElement => {
  const [session] = useState(() => createChatSession(definition))
  const [sessionId] = useState(() => `${definition.id}:${Date.now().toString(36)}`)
  const [actionError, setActionError] = useState<Error | undefined>()
  const [resolvedInstances, setResolvedInstances] = useState<ReadonlySet<string>>(() => new Set())
  const resolvedInstancesRef = useRef(new Set<string>())
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)
  const chatRef = useRef(chat)
  chatRef.current = chat
  const [confirmation] = useState(() => createActionConfirmation({ sessionId, ...(actionConfirmationTtlMs === undefined ? {} : { ttlMs: actionConfirmationTtlMs }), chat: {
    proposeToolCall: proposal => chatRef.current.proposeToolCall(proposal),
    approve: id => chatRef.current.approve(id),
    deny: (id, reason) => chatRef.current.deny(id, reason),
  } }))
  const selectComponent = (event: ComponentSelectionEvent, frame: import('@agentskit/chat-protocol').ComponentRenderFrame): void => {
    if (resolvedInstancesRef.current.has(event.instanceId)) return
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

  return (
    <section aria-label={`${definition.id} chat`} data-ak-app-chat="">
      <div aria-live="polite" aria-relevant="additions text" role="log">
        <ChatContainer>
          {chat.messages.map(message => {
            const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
            const decoded = candidate ? decodeComponentFrame(message.content) : undefined
            if (decoded?.ok) {
              const resolved = definition.components === undefined
                ? undefined
                : resolveChoiceListFrame(decoded.frame, definition.components)
              return resolved?.ok
                ? <ChoiceList key={message.id} frame={decoded.frame} manifest={definition.components!} disabled={resolvedInstances.has(decoded.frame.instanceId)} onSelect={event => selectComponent(event, decoded.frame)} />
                : <p key={message.id} data-ak-component-fallback="">{formatSemanticFallback(decoded.frame.fallback)}</p>
            }
            if (decoded && !decoded.ok) return <p key={message.id} role="alert" data-ak-component-diagnostic={decoded.diagnostic.code}>{decoded.diagnostic.message}</p>
            return <Message key={message.id} message={message} />
          })}
          {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
            <ToolConfirmation key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
          ))}
          <ThinkingIndicator visible={chat.status === 'streaming'} />
        </ChatContainer>
      </div>
      {chat.error || actionError ? <p role="alert">{chat.error?.message ?? actionError?.message}</p> : null}
      {chat.status === 'streaming' ? <button type="button" onClick={chat.stop}>Stop</button> : null}
      <InputBar
        chat={chat}
        disabled={chat.status === 'streaming'}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
    </section>
  )
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <AgentChatSession key={props.definition.id} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
