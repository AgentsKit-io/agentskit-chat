import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatReturn } from '@agentskit/core'
import { ChoiceListComponent, defineChat, defineComponentManifest } from '@agentskit/chat'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import type { ReactNode } from 'react'

const stop = vi.fn()
const useChat = vi.fn()

vi.mock('react-native', () => ({
  View: ({ children, testID, accessibilityLiveRegion }: { children?: ReactNode; testID?: string; accessibilityLiveRegion?: string }) => <div data-testid={testID} data-live={accessibilityLiveRegion}>{children}</div>,
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
    expect(document.querySelector('[data-live="polite"]')).toBeTruthy()
  })

  it('exposes cancellation while streaming', async () => {
    const { AgentChatNative } = await import('../src/index')
    render(<AgentChatNative definition={definition} />)
    fireEvent.click(screen.getByTestId('ak-stop'))

    expect(stop).toHaveBeenCalledOnce()
  })

  it('emits the common event from a native ChoiceList', async () => {
    const { ChoiceListNative } = await import('../src/index')
    const manifest = defineComponentManifest([ChoiceListComponent])
    const onSelect = vi.fn()
    render(<ChoiceListNative frame={validChoiceListFrame} manifest={manifest} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('ak-choice-docs'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ type: 'select', choiceId: 'docs' }))
    cleanup()
    render(<ChoiceListNative frame={invalidChoiceListPropsFrame} manifest={manifest} onSelect={onSelect} />)
    expect(screen.queryByTestId('ak-choice-list')).toBeNull()
  })

  it('renders an agent frame through the native chat shell and falls back for an unknown component', async () => {
    const { AgentChatNative } = await import('../src/index')
    const manifest = defineComponentManifest([ChoiceListComponent])
    const onComponentSelect = vi.fn()
    useChat.mockReturnValue({
      messages: [{ id: 'choice', role: 'assistant', content: JSON.stringify(validChoiceListFrame) }], status: 'idle', stop,
    } as unknown as ChatReturn)
    const view = render(<AgentChatNative definition={{ ...definition, components: manifest }} onComponentSelect={onComponentSelect} />)
    fireEvent.click(screen.getByTestId('ak-choice-demo'))
    expect(onComponentSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'demo' }))

    useChat.mockReturnValue({
      messages: [{ id: 'unknown', role: 'assistant', content: JSON.stringify(unknownComponentFrame) }], status: 'idle', stop,
    } as unknown as ChatReturn)
    view.rerender(<AgentChatNative definition={{ ...definition, components: manifest }} onComponentSelect={onComponentSelect} />)
    expect(screen.getByText('[unsupported visual: choice-list] Choose Documentation or Demo.')).toBeTruthy()

    useChat.mockReturnValue({
      messages: [{ id: 'invalid', role: 'assistant', content: JSON.stringify(invalidComponentFrameFixtures[1].frame) }], status: 'idle', stop,
    } as unknown as ChatReturn)
    view.rerender(<AgentChatNative definition={{ ...definition, components: manifest }} />)
    expect(screen.getByText('Component frame uses an unsupported version.')).toBeTruthy()
  })
})
