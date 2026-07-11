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

export const AgentChat = ({ definition, placeholder }: AgentChatProps): ReactElement => {
  const chat = useChat(definition.chat)

  return (
    <section aria-label={`${definition.id} chat`} data-ak-app-chat="">
      <ChatContainer>
        {chat.messages.map(message => <Message key={message.id} message={message} />)}
        <ThinkingIndicator visible={chat.status === 'streaming'} />
      </ChatContainer>
      {chat.error ? <p role="alert">{chat.error.message}</p> : null}
      <InputBar chat={chat} {...(placeholder === undefined ? {} : { placeholder })} />
    </section>
  )
}

export type { ChatDefinition } from '@agentskit/chat'
