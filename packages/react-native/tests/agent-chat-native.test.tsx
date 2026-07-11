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
  Pressable: ({ children, onPress, testID, disabled }: { children?: ReactNode; onPress?: () => void; testID?: string; disabled?: boolean }) => <button data-testid={testID} disabled={disabled} onClick={onPress}>{children}</button>,
}))

vi.mock('@agentskit/react-native', () => ({
  useChat,
  ChatContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Message: () => null,
  ThinkingIndicator: ({ visible }: { visible: boolean }) => visible ? <span>Thinking</span> : null,
  InputBar: () => <input />,
  ToolConfirmation: ({ toolCall, onApprove, onDeny }: { toolCall: { id: string; status: string }; onApprove: (id: string) => void; onDeny: (id: string) => void }) => toolCall.status === 'requires_confirmation' ? <><button onClick={() => onApprove(toolCall.id)}>Approve</button><button onClick={() => onDeny(toolCall.id)}>Deny</button></> : null,
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

  it('keeps a typed action bound through native rerenders and approves once', async () => {
    const { AgentChatNative } = await import('../src/index')
    const proposeToolCall = vi.fn(async proposal => ({ ...proposal, status: 'requires_confirmation' as const }))
    const approve = vi.fn(async () => undefined)
    const deny = vi.fn(async () => undefined)
    const actionable = {
      ...validChoiceListFrame,
      props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs'
        ? { ...choice, action: { name: 'open-docs', input: {} } } : choice) },
    }
    const manifest = defineComponentManifest([ChoiceListComponent])
    const base = { status: 'idle', stop, proposeToolCall, approve, deny }
    useChat.mockReturnValue({ ...base, messages: [{ id: 'choice', role: 'assistant', content: JSON.stringify(actionable) }] } as unknown as ChatReturn)
    const view = render(<AgentChatNative definition={{ ...definition, components: manifest }} />)
    const choice = screen.getByTestId('ak-choice-docs')
    fireEvent.click(choice)
    fireEvent.click(choice)
    expect(proposeToolCall).toHaveBeenCalledOnce()
    const call = await proposeToolCall.mock.results[0]!.value
    useChat.mockReturnValue({ ...base, messages: [{ id: 'call', role: 'assistant', content: '', toolCalls: [call] }] } as unknown as ChatReturn)
    view.rerender(<AgentChatNative definition={{ ...definition, components: manifest }} />)
    fireEvent.click(screen.getByText('Approve'))
    expect(approve).toHaveBeenCalledOnce()
    expect(deny).not.toHaveBeenCalled()
  })
})
