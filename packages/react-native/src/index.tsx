import type { ChatDefinition } from '@agentskit/chat'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  useChat,
} from '@agentskit/react-native'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

export interface AgentChatNativeProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
}

const AgentChatNativeSession = ({ definition, placeholder }: AgentChatNativeProps): ReactElement => {
  const chat = useChat(definition.chat)

  return (
    <View testID="ak-app-chat" accessibilityLabel={`${definition.id} chat`}>
      <ChatContainer>
        {chat.messages.map(message => <Message key={message.id} message={message} />)}
        <ThinkingIndicator visible={chat.status === 'streaming'} />
      </ChatContainer>
      {chat.error ? <Text accessibilityRole="alert">{chat.error.message}</Text> : null}
      {chat.status === 'streaming' ? (
        <Pressable
          testID="ak-stop"
          accessibilityRole="button"
          accessibilityLabel="Stop response"
          onPress={chat.stop}
        >
          <Text>Stop</Text>
        </Pressable>
      ) : null}
      <InputBar
        chat={chat}
        disabled={chat.status === 'streaming'}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
    </View>
  )
}

export const AgentChatNative = (props: AgentChatNativeProps): ReactElement => (
  <AgentChatNativeSession key={props.definition.id} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
