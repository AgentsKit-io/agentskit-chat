import { createChatSession, formatSemanticFallback, parseSemanticFallback } from '@agentskit/chat'
import type { ChatDefinition } from '@agentskit/chat'
import { ChatContainer, InputBar, Message, ThinkingIndicator, useChat } from '@agentskit/ink'
import { Box, Text } from 'ink'
import { useMemo, useState, type ReactElement } from 'react'

export interface SemanticFallbackProps {
  readonly fallback: unknown
}

export const SemanticFallback = ({ fallback }: SemanticFallbackProps): ReactElement => {
  const validated = parseSemanticFallback(fallback)
  return <Text dimColor>{formatSemanticFallback(validated)}</Text>
}

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
}

const AgentChatSession = ({ definition, placeholder }: AgentChatProps): ReactElement => {
  const [session] = useState(() => createChatSession(definition))
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)
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

export type { ChatDefinition, SemanticFallback as SemanticFallbackContent } from '@agentskit/chat'
