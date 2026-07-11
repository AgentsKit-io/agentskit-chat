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
} from '@agentskit/react-native'
import { useMemo, useRef, useState, type ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

export interface AgentChatNativeProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
}

export interface ChoiceListNativeProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly disabled?: boolean
}

export const ChoiceListNative = ({ frame, manifest, onSelect, disabled = false }: ChoiceListNativeProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  if (!resolved.ok) return null
  return (
  <View testID="ak-choice-list">
    <Text>{resolved.props.prompt}</Text>
    {resolved.props.choices.map(choice => (
      <Pressable
        key={choice.id}
        accessibilityRole="button"
        disabled={disabled}
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

const AgentChatNativeSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs }: AgentChatNativeProps): ReactElement => {
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
                ? <ChoiceListNative key={message.id} frame={decoded.frame} manifest={definition.components!} disabled={resolvedInstances.has(decoded.frame.instanceId)} onSelect={event => selectComponent(event, decoded.frame)} />
                : <Text key={message.id}>{formatSemanticFallback(decoded.frame.fallback)}</Text>
            }
            if (decoded && !decoded.ok) return <Text key={message.id} accessibilityRole="alert">{decoded.diagnostic.message}</Text>
            return <Message key={message.id} message={message} />
          })}
          {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
            <ToolConfirmation key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
          ))}
          <ThinkingIndicator visible={chat.status === 'streaming'} />
        </ChatContainer>
      </View>
      {chat.error || actionError ? <Text accessibilityRole="alert">{chat.error?.message ?? actionError?.message}</Text> : null}
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
