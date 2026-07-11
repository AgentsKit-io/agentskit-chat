import type { ChatDefinition } from '@agentskit/chat'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  useChat,
} from '@agentskit/react'
import type { ReactElement } from 'react'

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
}

const AgentChatSession = ({ definition, placeholder }: AgentChatProps): ReactElement => {
  const chat = useChat(definition.chat)

  return (
    <section aria-label={`${definition.id} chat`} data-ak-app-chat="">
      <div aria-live="polite" aria-relevant="additions text" role="log">
        <ChatContainer>
          {chat.messages.map(message => <Message key={message.id} message={message} />)}
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
