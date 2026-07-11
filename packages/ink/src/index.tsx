import type { ChatDefinition } from '@agentskit/chat'
import { ChatContainer, InputBar, Message, ThinkingIndicator, useChat } from '@agentskit/ink'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

export interface SemanticFallbackProps {
  readonly kind: string
  readonly summary: string
}

export const formatSemanticFallback = ({ kind, summary }: SemanticFallbackProps): string =>
  `[unsupported visual: ${kind}] ${summary}`

export const SemanticFallback = (props: SemanticFallbackProps): ReactElement => (
  <Text dimColor>{formatSemanticFallback(props)}</Text>
)

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
}

const AgentChatSession = ({ definition, placeholder }: AgentChatProps): ReactElement => {
  const chat = useChat(definition.chat)
  return (
    <Box flexDirection="column" gap={1}>
      <ChatContainer>
        {chat.messages.map(message => <Message key={message.id} message={message} />)}
        <ThinkingIndicator visible={chat.status === 'streaming'} />
      </ChatContainer>
      {chat.error ? <Text color="red">{chat.error.message}</Text> : null}
      <InputBar chat={chat} {...(placeholder === undefined ? {} : { placeholder })} />
    </Box>
  )
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <AgentChatSession key={props.definition.id} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
