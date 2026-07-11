import { createChatSession, formatSemanticFallback, parseSemanticFallback, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentSelectionEvent } from '@agentskit/chat-protocol'
import { ChatContainer, InputBar, Message, ThinkingIndicator, useChat } from '@agentskit/ink'
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

const AgentChatSession = ({ definition, placeholder, onComponentSelect = () => undefined }: AgentChatProps): ReactElement => {
  const [session] = useState(() => createChatSession(definition))
  const [resolvedInstances, setResolvedInstances] = useState<ReadonlySet<string>>(() => new Set())
  const config = useMemo(() => session.updateChat(definition.chat), [definition.chat, session])
  const chat = useChat(config)
  const activeComponentId = [...chat.messages].reverse().find(message => {
    if (message.role !== 'assistant' || definition.components === undefined || !isComponentFrameCandidate(message.content)) return false
    const decoded = decodeComponentFrame(message.content)
    return decoded.ok
      && !resolvedInstances.has(decoded.frame.instanceId)
      && resolveChoiceListFrame(decoded.frame, definition.components).ok
  })?.id
  const handleComponentSelect = (event: ComponentSelectionEvent): void => {
    setResolvedInstances(current => new Set(current).add(event.instanceId))
    onComponentSelect(event)
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
              ? <ChoiceList key={message.id} frame={decoded.frame} manifest={definition.components!} onSelect={handleComponentSelect} isActive={message.id === activeComponentId} />
              : <SemanticFallback key={message.id} fallback={decoded.frame.fallback} />
          }
          if (decoded && !decoded.ok) return <Text key={message.id} color="red">{decoded.diagnostic.message}</Text>
          return <Message key={message.id} message={message} />
        })}
        <ThinkingIndicator visible={chat.status === 'streaming'} />
      </ChatContainer>
      {chat.error ? <Text color="red">{chat.error.message}</Text> : null}
      <InputBar chat={chat} disabled={activeComponentId !== undefined} {...(placeholder === undefined ? {} : { placeholder })} />
    </Box>
  )
}

export const AgentChat = (props: AgentChatProps): ReactElement => (
  <AgentChatSession key={props.definition.id} {...props} />
)

export type { ChatDefinition, SemanticFallback as SemanticFallbackContent } from '@agentskit/chat'
