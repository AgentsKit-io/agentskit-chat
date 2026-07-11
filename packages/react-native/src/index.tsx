import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
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
import { useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactElement } from 'react'
import { Pressable, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native'

type NativeViewStyle = ViewStyle & Readonly<Record<string, unknown>>
type NativeTextStyle = TextStyle & Readonly<Record<string, unknown>>

export interface ChatNativeStyles {
  readonly root: NativeViewStyle
  readonly container: NativeViewStyle
  readonly userMessage: NativeViewStyle
  readonly userMessageText: NativeTextStyle
  readonly assistantMessage: NativeViewStyle
  readonly assistantMessageText: NativeTextStyle
  readonly choiceList: NativeViewStyle
  readonly choice: NativeViewStyle
  readonly choiceText: NativeTextStyle
  readonly mutedText: NativeTextStyle
  readonly input: NativeViewStyle
  readonly inputText: NativeTextStyle
  readonly dangerText: NativeTextStyle
}

export const toChatNativeStyles = (input?: ChatThemeInput): ChatNativeStyles => {
  const theme = resolveChatTheme(input)
  const font = theme.fontFamily === 'system' ? {} : { fontFamily: theme.fontFamily }
  return {
    root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.large },
    container: { backgroundColor: theme.colors.background },
    userMessage: { alignSelf: 'flex-end', backgroundColor: theme.colors.accent, borderRadius: theme.radius.large, padding: theme.spacing.medium },
    userMessageText: { color: theme.colors.onAccent, ...font },
    assistantMessage: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderRadius: theme.radius.large, padding: theme.spacing.medium },
    assistantMessageText: { color: theme.colors.text, ...font },
    choiceList: { gap: theme.spacing.small, padding: theme.spacing.medium },
    choice: { borderColor: theme.colors.border, borderRadius: theme.radius.medium, borderWidth: 1, padding: theme.spacing.medium },
    choiceText: { color: theme.colors.text, ...font },
    mutedText: { color: theme.colors.muted, ...font },
    input: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderTopWidth: 1, padding: theme.spacing.medium },
    inputText: { color: theme.colors.text, ...font },
    dangerText: { color: theme.colors.danger, ...font },
  }
}

export interface AgentChatNativeSlots {
  readonly Container?: ComponentType<ComponentProps<typeof ChatContainer>>
  readonly Message?: ComponentType<ComponentProps<typeof Message>>
  readonly Input?: ComponentType<ComponentProps<typeof InputBar>>
  readonly Thinking?: ComponentType<ComponentProps<typeof ThinkingIndicator>>
  readonly Confirmation?: ComponentType<ComponentProps<typeof ToolConfirmation>>
  readonly ChoiceList?: ComponentType<ChoiceListNativeProps>
}

export interface AgentChatNativeProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
  readonly theme?: ChatThemeInput
  readonly slots?: AgentChatNativeSlots
}

export interface ChoiceListNativeProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly disabled?: boolean
  readonly styles?: ChatNativeStyles
}

export const ChoiceListNative = ({ frame, manifest, onSelect, disabled = false, styles = toChatNativeStyles() }: ChoiceListNativeProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  if (!resolved.ok) return null
  return (
  <View testID="ak-choice-list" style={styles.choiceList}>
    <Text style={styles.choiceText}>{resolved.props.prompt}</Text>
    {resolved.props.choices.map(choice => (
      <Pressable
        key={choice.id}
        accessibilityRole="button"
        disabled={disabled}
        accessibilityLabel={choice.description === undefined ? choice.label : `${choice.label}. ${choice.description}`}
        onPress={() => onSelect(selectChoice(resolved.frame, choice.id))}
        testID={`ak-choice-${choice.id}`}
        style={styles.choice}
      >
        <Text style={styles.choiceText}>{choice.label}</Text>
        {choice.description === undefined ? null : <Text style={styles.mutedText}>{choice.description}</Text>}
      </Pressable>
    ))}
  </View>
  )
}

const AgentChatNativeSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs, session: preparedSession, theme, slots = {} }: AgentChatNativeProps): ReactElement => {
  const styles = toChatNativeStyles(theme)
  const ContainerSlot = slots.Container ?? ChatContainer
  const MessageSlot = slots.Message ?? Message
  const InputSlot = slots.Input ?? InputBar
  const ThinkingSlot = slots.Thinking ?? ThinkingIndicator
  const ConfirmationSlot = slots.Confirmation ?? ToolConfirmation
  const ChoiceListSlot = slots.ChoiceList ?? ChoiceListNative
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
    <View testID="ak-app-chat" accessibilityLabel={`${definition.id} chat`} style={styles.root}>
      <View accessibilityLiveRegion="polite">
        <ContainerSlot style={styles.container}>
          {chat.messages.map(message => {
            const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
            const decoded = candidate ? decodeComponentFrame(message.content) : undefined
            if (decoded?.ok) {
              const resolved = definition.components === undefined
                ? undefined
                : resolveChoiceListFrame(decoded.frame, definition.components)
              return resolved?.ok
                ? <ChoiceListSlot key={message.id} frame={decoded.frame} manifest={definition.components!} disabled={resolvedInstances.has(decoded.frame.instanceId)} onSelect={event => selectComponent(event, decoded.frame)} styles={styles} />
                : <Text key={message.id} style={styles.assistantMessageText}>{formatSemanticFallback(decoded.frame.fallback)}</Text>
            }
            if (decoded && !decoded.ok) return <Text key={message.id} accessibilityRole="alert" style={styles.dangerText}>{decoded.diagnostic.message}</Text>
            return <MessageSlot
              key={message.id}
              message={message}
              style={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
              contentStyle={message.role === 'user' ? styles.userMessageText : styles.assistantMessageText}
            />
          })}
          {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
            <ConfirmationSlot key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
          ))}
          <ThinkingSlot visible={chat.status === 'streaming'} />
        </ContainerSlot>
      </View>
      {chat.error || actionError ? <Text accessibilityRole="alert" style={styles.dangerText}>{chat.error?.message ?? actionError?.message}</Text> : null}
      {chat.status === 'streaming' ? (
        <Pressable
          testID="ak-stop"
          accessibilityRole="button"
          accessibilityLabel="Stop response"
          onPress={chat.stop}
        >
          <Text style={styles.choiceText}>Stop</Text>
        </Pressable>
      ) : null}
      {chat.status !== 'streaming' && targets.userId ? (
        <View accessibilityLabel="Response actions">
          <Pressable accessibilityRole="button" accessibilityLabel="Retry response" testID="ak-retry" onPress={() => runLifecycle(chat.retry())}><Text style={styles.choiceText}>Retry</Text></Pressable>
          {targets.assistantId ? <Pressable accessibilityRole="button" accessibilityLabel="Regenerate response" testID="ak-regenerate" onPress={() => runLifecycle(chat.regenerate(targets.assistantId))}><Text style={styles.choiceText}>Regenerate</Text></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Edit last message" testID="ak-edit" onPress={() => setEditDraft({ messageId: targets.userId!, content: chat.messages.find(message => message.id === targets.userId)?.content ?? '' })}><Text style={styles.choiceText}>Edit</Text></Pressable>
          {editDraft === undefined ? null : <>
            <TextInput accessibilityLabel="Edit message" testID="ak-edit-input" value={editDraft.content} style={styles.inputText} onChangeText={content => setEditDraft({ ...editDraft, content })} />
            <Pressable accessibilityRole="button" accessibilityLabel="Save edit" testID="ak-edit-save" disabled={editDraft.content.trim() === ''} onPress={() => {
              runLifecycle(chat.edit(editDraft.messageId, editDraft.content))
              setEditDraft(undefined)
            }}><Text style={styles.choiceText}>Save</Text></Pressable>
          </>}
        </View>
      ) : null}
      <InputSlot
        chat={chat}
        disabled={chat.status === 'streaming'}
        style={styles.input}
        inputStyle={styles.inputText}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
    </View>
  )
}

export const AgentChatNative = (props: AgentChatNativeProps): ReactElement => (
  <AgentChatNativeSession key={`${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`} {...props} />
)

export type { ChatDefinition } from '@agentskit/chat'
