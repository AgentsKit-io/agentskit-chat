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
} from '@agentskit/react-native'
import { useMemo, useState, type ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

export interface AgentChatNativeProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
}

export interface ChoiceListNativeProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
}

export const ChoiceListNative = ({ frame, manifest, onSelect }: ChoiceListNativeProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  if (!resolved.ok) return null
  return (
  <View testID="ak-choice-list">
    <Text>{resolved.props.prompt}</Text>
    {resolved.props.choices.map(choice => (
      <Pressable
        key={choice.id}
        accessibilityRole="button"
        accessibilityLabel={choice.description === undefined ? choice.label : `${choice.label}. ${choice.description}`}
        onPress={() => onSelect(selectChoice(resolved.frame, choice.id))}
        testID={`ak-choice-${choice.id}`}
      >
        <Text>{choice.label}</Text>
        {choice.description === undefined ? null : <Text>{choice.description}</Text>}
      </Pressable>
    ))}
  </View>
  )
}

const AgentChatNativeSession = ({ definition, placeholder, onComponentSelect = () => undefined }: AgentChatNativeProps): ReactElement => {
  const [session] = useState(() => createChatSession(definition))
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)

  return (
    <View testID="ak-app-chat" accessibilityLabel={`${definition.id} chat`}>
      <View accessibilityLiveRegion="polite">
        <ChatContainer>
          {chat.messages.map(message => {
            const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
            const decoded = candidate ? decodeComponentFrame(message.content) : undefined
            if (decoded?.ok) {
              const resolved = definition.components === undefined
                ? undefined
                : resolveChoiceListFrame(decoded.frame, definition.components)
              return resolved?.ok
                ? <ChoiceListNative key={message.id} frame={decoded.frame} manifest={definition.components!} onSelect={onComponentSelect} />
                : <Text key={message.id}>{formatSemanticFallback(decoded.frame.fallback)}</Text>
            }
            if (decoded && !decoded.ok) return <Text key={message.id} accessibilityRole="alert">{decoded.diagnostic.message}</Text>
            return <Message key={message.id} message={message} />
          })}
          <ThinkingIndicator visible={chat.status === 'streaming'} />
        </ChatContainer>
      </View>
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
