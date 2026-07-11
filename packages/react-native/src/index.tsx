import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ComponentManifest } from '@agentskit/chat'
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
import { Pressable, Text, TextInput, View } from 'react-native'

export interface AgentChatNativeProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
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

const AgentChatNativeSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs, session: preparedSession }: AgentChatNativeProps): ReactElement => {
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
  const targets = getLifecycleTargets(chat.messages)
  const runLifecycle = (operation: Promise<void>): void => {
    setActionError(undefined)
    void operation.catch(error => setActionError(error instanceof Error ? error : new Error('Lifecycle operation failed.')))
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
      {chat.status !== 'streaming' && targets.userId ? (
        <View accessibilityLabel="Response actions">
          <Pressable accessibilityRole="button" accessibilityLabel="Retry response" testID="ak-retry" onPress={() => runLifecycle(chat.retry())}><Text>Retry</Text></Pressable>
          {targets.assistantId ? <Pressable accessibilityRole="button" accessibilityLabel="Regenerate response" testID="ak-regenerate" onPress={() => runLifecycle(chat.regenerate(targets.assistantId))}><Text>Regenerate</Text></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Edit last message" testID="ak-edit" onPress={() => setEditDraft({ messageId: targets.userId!, content: chat.messages.find(message => message.id === targets.userId)?.content ?? '' })}><Text>Edit</Text></Pressable>
          {editDraft === undefined ? null : <>
            <TextInput accessibilityLabel="Edit message" testID="ak-edit-input" value={editDraft.content} onChangeText={content => setEditDraft({ ...editDraft, content })} />
            <Pressable accessibilityRole="button" accessibilityLabel="Save edit" testID="ak-edit-save" disabled={editDraft.content.trim() === ''} onPress={() => {
              runLifecycle(chat.edit(editDraft.messageId, editDraft.content))
              setEditDraft(undefined)
            }}><Text>Save</Text></Pressable>
          </>}
        </View>
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
  <AgentChatNativeSession key={`${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
