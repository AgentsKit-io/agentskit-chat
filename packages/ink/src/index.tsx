import { STANDARD_COMPONENT_KEYS, createActionConfirmation, createControlledChatDriver, formatSemanticFallback, getLifecycleTargets, parseSemanticFallback, presentChatMessage, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, resolveComponentFrame, selectChoice } from '@agentskit/chat'
import type { ActionConfirmationCoordinator, ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest, ControlledChatDriver, ControlledChatSource } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat/protocol'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat/protocol'
import { ChatContainer, defaultInkTheme, InkThemeProvider, InputBar, Message, ThinkingIndicator, ToolConfirmation, useChat, useInkTheme } from '@agentskit/ink'
import type { InkTheme } from '@agentskit/ink'
import type { ChatReturn } from '@agentskit/core'
import { Box, Text, useInput } from 'ink'
import { useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactElement } from 'react'
import { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

export { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

export const toChatInkTheme = (input?: ChatThemeInput): InkTheme => {
  const theme = resolveChatTheme(input)
  return {
    roles: {
      ...defaultInkTheme.roles,
      user: { ...defaultInkTheme.roles.user, color: theme.colors.accent },
      assistant: { ...defaultInkTheme.roles.assistant, color: theme.colors.accent },
      system: { ...defaultInkTheme.roles.system, color: theme.colors.muted },
      tool: { ...defaultInkTheme.roles.tool, color: theme.colors.accent },
    },
    toolStatus: {
      ...defaultInkTheme.toolStatus,
      pending: { ...defaultInkTheme.toolStatus.pending, color: theme.colors.muted },
      running: { ...defaultInkTheme.toolStatus.running, color: theme.colors.accent },
      complete: { ...defaultInkTheme.toolStatus.complete, color: theme.colors.accent },
      error: { ...defaultInkTheme.toolStatus.error, color: theme.colors.danger },
      requires_confirmation: { ...defaultInkTheme.toolStatus.requires_confirmation, color: theme.colors.accent },
    },
    prompt: { active: theme.colors.accent, busy: theme.colors.muted },
    inputText: { active: theme.colors.text, busy: theme.colors.muted },
    header: { border: theme.colors.border, title: theme.colors.accent },
    usage: { prompt: theme.colors.accent, completion: theme.colors.muted },
    segment: { ...defaultInkTheme.segment, provider: theme.colors.accent, model: theme.colors.accent, modeLive: theme.colors.accent, modeDemo: theme.colors.muted, tools: theme.colors.accent, muted: theme.colors.muted },
  }
}

export interface AgentChatSlots {
  readonly Container?: ComponentType<ComponentProps<typeof ChatContainer>>
  readonly Message?: ComponentType<ComponentProps<typeof Message>>
  readonly Input?: ComponentType<ComponentProps<typeof InputBar>>
  readonly Thinking?: ComponentType<ComponentProps<typeof ThinkingIndicator>>
  readonly Confirmation?: ComponentType<ComponentProps<typeof ToolConfirmation>>
  readonly ChoiceList?: ComponentType<ChoiceListProps>
  readonly StandardComponent?: ComponentType<StandardComponentProps>
}

export interface SemanticFallbackProps {
  readonly fallback: unknown
}

export const SemanticFallback = ({ fallback }: SemanticFallbackProps): ReactElement => {
  const validated = parseSemanticFallback(fallback)
  return <Text dimColor>{formatSemanticFallback(validated)}</Text>
}

export interface AgentChatBaseProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly onComponentInteract?: (event: ComponentInteractionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly theme?: ChatThemeInput
  readonly slots?: AgentChatSlots
}

export type AgentChatProps = AgentChatBaseProps & (
  | { readonly session?: ChatSession, readonly controlled?: undefined }
  | { readonly controlled: ControlledChatSource, readonly session?: undefined }
)

export interface ChoiceListProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly isActive?: boolean
}

interface ResolvedChoiceListProps {
  readonly resolved: Extract<ReturnType<typeof resolveChoiceListFrame>, { readonly ok: true }>
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly isActive: boolean
}

const ResolvedChoiceList = ({ resolved, onSelect, isActive }: ResolvedChoiceListProps): ReactElement => {
  const theme = useInkTheme()
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const numericBufferRef = useRef('')
  const activate = (index: number): void => {
    activeIndexRef.current = index
    setActiveIndex(index)
  }
  useInput((input, key) => {
    if (!isActive) return
    if (key.upArrow) activate(Math.max(0, activeIndexRef.current - 1))
    if (key.downArrow) activate(Math.min(resolved.props.choices.length - 1, activeIndexRef.current + 1))
    if (key.upArrow || key.downArrow) numericBufferRef.current = ''
    if (/^[0-9]$/.test(input)) numericBufferRef.current = `${numericBufferRef.current}${input}`.slice(-2)
    if (key.return) {
      const numericIndex = Number(numericBufferRef.current) - 1
      const selectedIndex = numericBufferRef.current !== '' && resolved.props.choices[numericIndex] !== undefined
        ? numericIndex
        : activeIndexRef.current
      numericBufferRef.current = ''
      onSelect(selectChoice(resolved.frame, resolved.props.choices[selectedIndex]!.id))
    }
  })
  return (
    <Box flexDirection="column">
      <Text bold>{resolved.props.prompt}</Text>
      {resolved.props.choices.map((choice, index) => (
        <Text key={choice.id} inverse={index === activeIndex}>
          <Text color={theme.prompt.active}>{index + 1}.</Text>{' '}
          <Text>{choice.label}</Text>
          {choice.description === undefined ? null : <Text dimColor> — {choice.description}</Text>}
        </Text>
      ))}
      <Text dimColor>Use ↑/↓ or a number, then Enter.</Text>
    </Box>
  )
}

export const ChoiceList = ({ frame, manifest, onSelect, isActive = true }: ChoiceListProps): ReactElement | null => {
  const resolved = resolveChoiceListFrame(frame, manifest)
  return resolved.ok ? <ResolvedChoiceList resolved={resolved} onSelect={onSelect} isActive={isActive} /> : null
}

type AgentChatViewProps = AgentChatProps & {
  readonly chat: ChatReturn
  readonly sessionId: string
  readonly confirmation: ActionConfirmationCoordinator
}

const AgentChatView = ({ definition, placeholder, onComponentSelect = () => undefined, onComponentInteract = () => undefined, slots = {}, chat, sessionId, confirmation }: AgentChatViewProps): ReactElement => {
  const theme = useInkTheme()
  const ContainerSlot = slots.Container ?? ChatContainer
  const MessageSlot = slots.Message ?? Message
  const InputSlot = slots.Input ?? InputBar
  const ThinkingSlot = slots.Thinking ?? ThinkingIndicator
  const ConfirmationSlot = slots.Confirmation ?? ToolConfirmation
  const ChoiceListSlot = slots.ChoiceList ?? ChoiceList
  const StandardComponentSlot = slots.StandardComponent ?? StandardComponent
  const [actionError, setActionError] = useState<Error | undefined>()
  const [resolvedInstances, setResolvedInstances] = useState<ReadonlySet<string>>(() => new Set())
  const resolvedInstancesRef = useRef(new Set<string>())
  const chatRef = useRef(chat)
  chatRef.current = chat
  const activePresentation = [...chat.messages].reverse().flatMap(message =>
    [...presentChatMessage(message)].reverse(),
  ).find(presentation => {
    if (presentation.kind !== 'component' || definition.components === undefined) return false
    const resolved = resolveComponentFrame(presentation.frame, definition.components)
    return resolved.ok
      && (definition.components[presentation.frame.componentKey]?.events?.length ?? 0) > 0
      && !resolvedInstances.has(presentation.frame.instanceId)
  })
  const activeComponentInstanceId = activePresentation?.kind === 'component' ? activePresentation.frame.instanceId : undefined
  const handleComponentSelect = (event: ComponentSelectionEvent, frame: ComponentRenderFrame): void => {
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
    else {
      let submission
      try { submission = definition.choiceSubmission?.(frame, event.choiceId, { sessionId }) } catch (error) {
        resolvedInstancesRef.current.delete(event.instanceId)
        setResolvedInstances(new Set(resolvedInstancesRef.current))
        setActionError(error instanceof Error ? error : new Error('Choice submission authorization failed.'))
        return
      }
      if (submission && 'unavailable' in submission) {
        resolvedInstancesRef.current.delete(event.instanceId)
        setResolvedInstances(new Set(resolvedInstancesRef.current))
        setActionError(new Error('This deterministic choice expired. Ask the question again.'))
        return
      }
      if (submission) void chatRef.current.send(submission.value).then(
        () => { try { submission.commit() } catch (error) { setActionError(error instanceof Error ? error : new Error('Choice submission settlement failed.')) } },
        error => {
          try { submission.release() } catch { /* settlement isolation */ }
          finally { resolvedInstancesRef.current.delete(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current)) }
          setActionError(error instanceof Error ? error : new Error('Choice submission failed.'))
        },
      )
    }
  }
  const interactComponent = (event: ComponentInteractionEvent): void => {
    if (resolvedInstancesRef.current.has(event.instanceId)) return
    resolvedInstancesRef.current.add(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current))
    try { onComponentInteract(event) } catch (error) { resolvedInstancesRef.current.delete(event.instanceId); setResolvedInstances(new Set(resolvedInstancesRef.current)); setActionError(error instanceof Error ? error : new Error('Component interaction callback failed.')) }
  }
  const approve = (toolCallId: string): void => {
    const record = confirmation.getByToolCall(toolCallId)
    void (record ? confirmation.approve(record.token, sessionId) : chat.approve(toolCallId)).catch(error => setActionError(error instanceof Error ? error : new Error('Action approval failed.')))
  }
  const deny = (toolCallId: string, reason?: string): void => {
    const record = confirmation.getByToolCall(toolCallId)
    void (record ? confirmation.reject(record.token, sessionId, reason) : chat.deny(toolCallId, reason)).catch(error => setActionError(error instanceof Error ? error : new Error('Action rejection failed.')))
  }
  const handleLifecycleCommand = async (input: string): Promise<boolean> => {
    const targets = getLifecycleTargets(chat.messages)
    try {
      if (input === '/retry') await chat.retry()
      else if (input === '/regenerate') await chat.regenerate(targets.assistantId)
      else if (input.startsWith('/edit ') && targets.userId) await chat.edit(targets.userId, input.slice(6))
      else return false
      setActionError(undefined)
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error('Lifecycle operation failed.'))
    }
    return true
  }
  return (
    <Box flexDirection="column" gap={1}>
      <ContainerSlot>
        {chat.messages.flatMap(message => presentChatMessage(message).map((presentation, index) => {
          const key = `${message.id}:${index}`
          if (presentation.kind === 'component') {
            const manifest = definition.components
            const resolved = manifest === undefined ? undefined : resolveComponentFrame(presentation.frame, manifest)
            if (resolved?.ok && slots.StandardComponent === undefined && !STANDARD_COMPONENT_KEYS.includes(presentation.frame.componentKey as typeof STANDARD_COMPONENT_KEYS[number])) return <Text key={key}>{formatSemanticFallback(presentation.frame.fallback)}</Text>
            if (resolved?.ok) return presentation.frame.componentKey === 'choice-list'
              ? <ChoiceListSlot key={key} frame={presentation.frame} manifest={manifest!} onSelect={event => handleComponentSelect(event, presentation.frame)} isActive={presentation.frame.instanceId === activeComponentInstanceId} />
              : <StandardComponentSlot key={key} frame={presentation.frame} manifest={manifest!} onInteract={interactComponent} isActive={presentation.frame.instanceId === activeComponentInstanceId} />
            return <SemanticFallback key={key} fallback={presentation.frame.fallback} />
          }
          if (presentation.kind === 'diagnostic') return <Text key={key} color={theme.toolStatus.error.color}>{presentation.message}</Text>
          return <MessageSlot key={key} message={presentation.message} />
        }))}
        {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
          <ConfirmationSlot key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
        ))}
        <ThinkingSlot visible={chat.status === 'streaming'} />
      </ContainerSlot>
      {chat.error || actionError ? <Text color={theme.toolStatus.error.color}>{chat.error?.message ?? actionError?.message}</Text> : null}
      <InputSlot chat={chat} disabled={activeComponentInstanceId !== undefined} onSubmitInput={handleLifecycleCommand} {...(placeholder === undefined ? {} : { placeholder })} />
      <Text dimColor>/retry · /regenerate · /edit &lt;message&gt; · Esc stop</Text>
    </Box>
  )
}

const chatActions = (chatRef: { readonly current: ChatReturn }): Pick<ChatReturn, 'proposeToolCall' | 'approve' | 'deny'> => ({
  proposeToolCall: proposal => chatRef.current.proposeToolCall(proposal),
  approve: id => chatRef.current.approve(id),
  deny: (id, reason) => chatRef.current.deny(id, reason),
})

const AgentChatSession = (props: AgentChatProps): ReactElement => {
  const [session] = useState(() => resolveChatSession(props.definition, props.session))
  const config = useMemo(() => session.updateChat(props.definition.chat), [props.definition.chat, session])
  const chat = useChat(config)
  const chatRef = useRef<ChatReturn>(chat)
  chatRef.current = chat
  const [confirmation] = useState(() => session.createConfirmation({
    ...(props.actionConfirmationTtlMs === undefined ? {} : { ttlMs: props.actionConfirmationTtlMs }),
    chat: chatActions(chatRef),
  }))
  return <AgentChatView {...props} chat={chat} sessionId={session.sessionId} confirmation={confirmation} />
}

type ControlledAgentChatSessionProps = AgentChatProps & { readonly chat: ControlledChatDriver }

const ControlledAgentChatSession = ({ chat, ...props }: ControlledAgentChatSessionProps): ReactElement => {
  const chatRef = useRef<ChatReturn>(chat)
  chatRef.current = chat
  const [confirmation] = useState(() => createActionConfirmation({
    sessionId: chat.sessionId,
    ...(props.actionConfirmationTtlMs === undefined ? {} : { ttlMs: props.actionConfirmationTtlMs }),
    chat: chatActions(chatRef),
  }))
  return <AgentChatView {...props} chat={chat} sessionId={chat.sessionId} confirmation={confirmation} />
}

const AgentChatContent = (props: AgentChatProps): ReactElement => {
  if (props.controlled !== undefined) {
    const chat = createControlledChatDriver(props.controlled)
    return <ControlledAgentChatSession key={`${props.definition.id}:${props.definition.revision ?? 1}:${chat.sessionId}:controlled`} {...props} chat={chat} />
  }
  return <AgentChatSession key={`${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`} {...props} />
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <InkThemeProvider {...(props.theme === undefined ? {} : { theme: toChatInkTheme(props.theme) })}>
    <AgentChatContent {...props} />
  </InkThemeProvider>
)

export type { ChatDefinition, SemanticFallback as SemanticFallbackContent } from '@agentskit/chat'
