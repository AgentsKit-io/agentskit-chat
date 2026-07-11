import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatReturn } from '@agentskit/core'
import { defineChat } from '@agentskit/chat'
import type { ReactNode } from 'react'

const stop = vi.fn()
const useChat = vi.fn()

vi.mock('react-native', () => ({
  View: ({ children, testID }: { children?: ReactNode; testID?: string }) => <div data-testid={testID}>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: ({ children, onPress, testID }: { children?: ReactNode; onPress?: () => void; testID?: string }) => <button data-testid={testID} onClick={onPress}>{children}</button>,
}))

vi.mock('@agentskit/react-native', () => ({
  useChat,
  ChatContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Message: () => null,
  ThinkingIndicator: ({ visible }: { visible: boolean }) => visible ? <span>Thinking</span> : null,
  InputBar: () => <input />,
}))

const definition = defineChat({
  id: 'native-test',
  chat: { adapter: { createSource: () => ({ async *stream() {}, abort() {} }) } },
})

describe('AgentChatNative', () => {
  afterEach(cleanup)

  beforeEach(() => {
    stop.mockReset()
    useChat.mockReturnValue({ messages: [], status: 'streaming', stop } as unknown as ChatReturn)
  })

  it('delegates the shared definition to upstream useChat', async () => {
    const { AgentChatNative } = await import('../src/index')
    render(<AgentChatNative definition={definition} />)

    expect(useChat).toHaveBeenCalledWith(definition.chat)
    expect(screen.getByText('Thinking')).toBeTruthy()
  })

  it('exposes cancellation while streaming', async () => {
    const { AgentChatNative } = await import('../src/index')
    render(<AgentChatNative definition={definition} />)
    fireEvent.click(screen.getByTestId('ak-stop'))

    expect(stop).toHaveBeenCalledOnce()
  })
})
