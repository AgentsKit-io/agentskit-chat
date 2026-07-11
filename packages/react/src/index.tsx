import { createChatSession, formatSemanticFallback, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentSelectionEvent } from '@agentskit/chat-protocol'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  useChat,
} from '@agentskit/react'
import { useMemo, useState, type ReactElement } from 'react'

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
}

export interface ChoiceListProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
}

export const ChoiceList = ({ frame, manifest, onSelect }: ChoiceListProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  if (!resolved.ok) return null
  return (
    <fieldset aria-label={resolved.props.prompt} data-ak-component="choice-list">
      <legend>{resolved.props.prompt}</legend>
      {resolved.props.choices.map(choice => (
        <button key={choice.id} type="button" onClick={() => onSelect(selectChoice(resolved.frame, choice.id))}>
          <span>{choice.label}</span>
          {choice.description === undefined ? null : <small>{choice.description}</small>}
        </button>
      ))}
    </fieldset>
  )
}

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined }: AgentChatProps): ReactElement => {
  const [session] = useState(() => createChatSession(definition))
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)

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
                ? <ChoiceList key={message.id} frame={decoded.frame} manifest={definition.components!} onSelect={onComponentSelect} />
                : <p key={message.id} data-ak-component-fallback="">{formatSemanticFallback(decoded.frame.fallback)}</p>
            }
            if (decoded && !decoded.ok) return <p key={message.id} role="alert" data-ak-component-diagnostic={decoded.diagnostic.code}>{decoded.diagnostic.message}</p>
            return <Message key={message.id} message={message} />
          })}
          <ThinkingIndicator visible={chat.status === 'streaming'} />
        </ChatContainer>
      </div>
      {chat.error ? <p role="alert">{chat.error.message}</p> : null}
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
