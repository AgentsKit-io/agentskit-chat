import { defineChat, type ControlledChatActions } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat/ink'
import React, { useRef, useState, type ReactElement } from 'react'

interface SerializedMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly status: 'streaming' | 'complete'
  readonly createdAt: string
}

interface ControlledSnapshot {
  readonly sessionId: string
  readonly messages: readonly SerializedMessage[]
  readonly status: 'idle' | 'streaming' | 'complete' | 'error'
  readonly input: string
  readonly error: { readonly code?: string, readonly message: string } | null
  readonly usage: { readonly promptTokens: number, readonly completionTokens: number, readonly totalTokens: number }
}

const initialSnapshot: ControlledSnapshot = {
  sessionId: 'controlled-ink-pty',
  messages: [{
    id: 'controlled-ready',
    role: 'assistant',
    content: JSON.stringify({
      protocol: 'agentskit.chat.component',
      version: 1,
      type: 'render',
      componentKey: 'status-card',
      instanceId: 'controlled-ready-card',
      props: {},
      fallback: { kind: 'status', summary: 'Controlled host session is ready.' },
    }),
    status: 'complete',
    createdAt: '2026-07-14T00:00:00.000Z',
  }],
  status: 'idle',
  input: '',
  error: null,
  usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
}

const definition = defineChat({
  id: 'controlled-ink-pty',
  chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'done' as const } }, abort() {} }) } },
})

export const ControlledInkExample = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<ControlledSnapshot>(initialSnapshot)
  const sequence = useRef(0)
  const nextMessage = (role: SerializedMessage['role'], content: string, status: SerializedMessage['status'] = 'complete'): SerializedMessage => ({
    id: `controlled-${++sequence.current}`,
    role,
    content,
    status,
    createdAt: new Date(Date.UTC(2026, 6, 14, 0, 0, sequence.current)).toISOString(),
  })
  const actions: ControlledChatActions = {
    async send(input) {
      setSnapshot(current => ({
        ...current,
        input: '',
        status: input === '/slow' ? 'streaming' : 'complete',
        messages: [...current.messages, nextMessage('user', input), nextMessage('assistant', input === '/slow' ? 'Controlled stream: press Esc to stop' : `Controlled host received: ${input}`, input === '/slow' ? 'streaming' : 'complete')],
      }))
    },
    stop() {
      setSnapshot(current => ({
        ...current,
        status: 'idle',
        messages: current.messages.map((message, index) => index === current.messages.length - 1 && message.status === 'streaming'
          ? { ...message, content: 'Controlled stream cancelled.', status: 'complete' }
          : message),
      }))
    },
    async retry() { setSnapshot(current => ({ ...current, messages: [...current.messages, nextMessage('assistant', 'Controlled retry completed.')] })) },
    async edit(_messageId, content) { setSnapshot(current => ({ ...current, messages: [...current.messages, nextMessage('assistant', `Controlled edit: ${content}`)] })) },
    async regenerate() { setSnapshot(current => ({ ...current, messages: [...current.messages, nextMessage('assistant', 'Controlled regeneration completed.')] })) },
    setInput(input) { setSnapshot(current => ({ ...current, input })) },
    async clear() { setSnapshot({ ...initialSnapshot, messages: [] }) },
    async proposeToolCall(proposal) { return { ...proposal, status: 'requires_confirmation' } },
    async approve() {},
    async deny() {},
  }
  return <AgentChat definition={definition} controlled={{ snapshot, actions }} placeholder="Controlled host input" />
}
