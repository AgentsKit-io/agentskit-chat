import { createActionConfirmation, createChatSession, formatSemanticFallback, getLifecycleTargets, parseSemanticFallback, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentSelectionEvent } from '@agentskit/chat-protocol'
import { ChatContainer, InputBar, Message, ThinkingIndicator, ToolConfirmation, useChat } from '@agentskit/ink'
import { Box, Text, useInput } from 'ink'
import { useMemo, useRef, useState, type ReactElement } from 'react'

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
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
}

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
          <Text color="cyan">{index + 1}.</Text>{' '}
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

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined, actionConfirmationTtlMs }: AgentChatProps): ReactElement => {
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
  const activeComponentId = [...chat.messages].reverse().find(message => {
    if (message.role !== 'assistant' || definition.components === undefined || !isComponentFrameCandidate(message.content)) return false
    const decoded = decodeComponentFrame(message.content)
    return decoded.ok
      && !resolvedInstances.has(decoded.frame.instanceId)
      && resolveChoiceListFrame(decoded.frame, definition.components).ok
  })?.id
  const handleComponentSelect = (event: ComponentSelectionEvent, frame: import('@agentskit/chat-protocol').ComponentRenderFrame): void => {
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
      <ChatContainer>
        {chat.messages.map(message => {
          const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
          const decoded = candidate ? decodeComponentFrame(message.content) : undefined
          if (decoded?.ok) {
            const resolved = definition.components === undefined
              ? undefined
              : resolveChoiceListFrame(decoded.frame, definition.components)
            return resolved?.ok
              ? <ChoiceList key={message.id} frame={decoded.frame} manifest={definition.components!} onSelect={event => handleComponentSelect(event, decoded.frame)} isActive={message.id === activeComponentId} />
              : <SemanticFallback key={message.id} fallback={decoded.frame.fallback} />
          }
          if (decoded && !decoded.ok) return <Text key={message.id} color="red">{decoded.diagnostic.message}</Text>
          return <Message key={message.id} message={message} />
        })}
        {chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall => (
          <ToolConfirmation key={toolCall.id} toolCall={toolCall} onApprove={approve} onDeny={deny} />
        ))}
        <ThinkingIndicator visible={chat.status === 'streaming'} />
      </ChatContainer>
      {chat.error || actionError ? <Text color="red">{chat.error?.message ?? actionError?.message}</Text> : null}
      <InputBar chat={chat} disabled={activeComponentId !== undefined} onSubmitInput={handleLifecycleCommand} {...(placeholder === undefined ? {} : { placeholder })} />
      <Text dimColor>/retry · /regenerate · /edit &lt;message&gt; · Esc stop</Text>
    </Box>
  )
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <AgentChatSession key={props.definition.id} {...props} />
)

export type { ChatDefinition, SemanticFallback as SemanticFallbackContent } from '@agentskit/chat'
