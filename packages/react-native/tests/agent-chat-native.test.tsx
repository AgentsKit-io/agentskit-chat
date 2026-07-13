import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatReturn } from '@agentskit/core'
import { ChoiceListComponent, StandardComponentCatalog, createChatSession, defineChat, defineComponentManifest, resumeChatSession } from '@agentskit/chat'
import type { SessionSnapshot } from '@agentskit/chat-protocol'
import { AgentChat } from '../../react/src/index.js'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, standardComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import type { ReactNode } from 'react'

const stop = vi.fn()
const useChat = vi.fn()

vi.mock('react-native', () => ({
  View: ({ children, testID, accessibilityLiveRegion }: { children?: ReactNode; testID?: string; accessibilityLiveRegion?: string }) => <div data-testid={testID} data-live={accessibilityLiveRegion}>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  TextInput: ({ value, onChangeText, testID }: { value: string; onChangeText: (value: string) => void; testID?: string }) => <input data-testid={testID} value={value} onChange={event => onChangeText(event.target.value)} />,
  Pressable: ({ children, onPress, testID, disabled }: { children?: ReactNode; onPress?: () => void; testID?: string; disabled?: boolean }) => <button data-testid={testID} disabled={disabled} onClick={onPress}>{children}</button>,
}))

vi.mock('@agentskit/react-native', () => ({
  useChat,
  ChatContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Message: ({ contentStyle }: { contentStyle?: React.CSSProperties }) => <span data-testid="upstream-message-content" style={contentStyle}>Message</span>,
  ThinkingIndicator: ({ visible }: { visible: boolean }) => visible ? <span>Thinking</span> : null,
  InputBar: ({ inputStyle }: { inputStyle?: React.CSSProperties }) => <input data-testid="upstream-input" style={inputStyle} />,
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

  it('renders the complete standard catalog and emits interactions', async () => {
    const { StandardComponentNative } = await import('../src/index')
    const manifest = defineComponentManifest(StandardComponentCatalog); const onInteract = vi.fn()
    for (const frame of standardComponentFrameFixtures.filter(item => item.componentKey !== 'choice-list')) {
      const view = render(<StandardComponentNative frame={frame} manifest={manifest} onInteract={onInteract} />)
      expect(view.container.querySelector(`[data-testid="ak-${frame.componentKey}"]`)).toBeTruthy(); view.unmount()
    }
    render(<StandardComponentNative frame={standardComponentFrameFixtures[0]} manifest={manifest} onInteract={onInteract} />)
    fireEvent.click(screen.getByText('Save')); expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'select', value: 'save' }))
  })

  it('delegates the shared definition to upstream useChat', async () => {
    const { AgentChatNative } = await import('../src/index')
    render(<AgentChatNative definition={definition} />)

    expect(useChat).toHaveBeenCalledWith(definition.chat)
    expect(screen.getByText('Thinking')).toBeTruthy()
    expect(document.querySelector('[data-live="polite"]')).toBeTruthy()
  })

  it('maps semantic tokens to native styles and accepts a native slot', async () => {
    const { AgentChatNative, toChatNativeStyles } = await import('../src/index')
    expect(toChatNativeStyles({ colors: { accent: '#800080' }, spacing: { medium: 20 }, fontFamily: 'Brand Sans' })).toMatchObject({
      userMessage: { backgroundColor: '#800080', padding: 20 }, userMessageText: { color: '#ffffff', fontFamily: 'Brand Sans' }, input: { padding: 20 }, inputText: { fontFamily: 'Brand Sans' }, choiceText: { fontFamily: 'Brand Sans' },
    })
    expect(toChatNativeStyles().inputText).not.toHaveProperty('fontFamily')
    useChat.mockReturnValue({ messages: [{ id: 'assistant', role: 'assistant', content: 'hello' }], status: 'idle', stop } as unknown as ChatReturn)
    const Slot = () => <span>Custom native message</span>
    render(<AgentChatNative definition={definition} slots={{ Message: Slot }} />)
    expect(screen.getByText('Custom native message')).toBeTruthy()
    cleanup()
    render(<AgentChatNative definition={definition} theme={{ colors: { surface: '#111827', text: '#ffffff' }, fontFamily: 'Brand Sans' }} />)
    expect(screen.getByTestId('upstream-message-content').style.color).toBe('#ffffff')
    expect(screen.getByTestId('upstream-input').style.fontFamily).toContain('Brand Sans')
  })

  it('resumes a React-prepared pending action in React Native and persists terminal state', async () => {
    const { AgentChatNative } = await import('../src/index')
    let stored: SessionSnapshot | undefined
    const storage = {
      load: () => stored,
      save: (snapshot: SessionSnapshot, expected: number | undefined) => {
        if (stored?.cursor !== expected) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    const shared = defineChat({ id: 'cross-renderer', chat: { adapter: definition.chat.adapter } })
    const reactSession = createChatSession(shared, { sessionId: 'customer', storage })
    const reactView = render(<AgentChat definition={shared} session={reactSession} />)
    reactView.unmount()
    const proposal = { id: 'call-cross', name: 'open-docs', args: {}, status: 'requires_confirmation' as const }
    await reactSession.createConfirmation({ chat: { proposeToolCall: async () => proposal, approve: async () => undefined, deny: async () => undefined }, createId: () => 'cross' }).propose({ name: 'open-docs', input: {} })

    const nativeSession = await resumeChatSession(shared, { sessionId: 'customer', storage })
    const approve = vi.fn(async () => undefined)
    useChat.mockReturnValue({ messages: [{ id: 'assistant', role: 'assistant', content: '', toolCalls: [proposal] }], status: 'complete', stop, approve, deny: vi.fn() } as unknown as ChatReturn)
    render(<AgentChatNative definition={shared} session={nativeSession} />)
    fireEvent.click(screen.getByText('Approve'))
    await waitFor(() => expect(approve).toHaveBeenCalledOnce())
    expect(stored?.confirmations[0]?.status).toBe('approved')

    const terminal = await resumeChatSession(shared, { sessionId: 'customer', storage })
    expect(terminal.createConfirmation({ chat: { proposeToolCall: async () => proposal, approve, deny: vi.fn() } }).getByToolCall('call-cross')?.status).toBe('approved')
  })

  it('exposes cancellation while streaming', async () => {
    const { AgentChatNative } = await import('../src/index')
    render(<AgentChatNative definition={definition} />)
    fireEvent.click(screen.getByTestId('ak-stop'))

    expect(stop).toHaveBeenCalledOnce()
  })

  it('delegates native retry, regenerate, and edit controls', async () => {
    const { AgentChatNative } = await import('../src/index')
    const retry = vi.fn(async () => undefined)
    const regenerate = vi.fn(async () => undefined)
    const edit = vi.fn(async () => undefined)
    useChat.mockReturnValue({
      messages: [
        { id: 'user', role: 'user', content: 'original' },
        { id: 'assistant', role: 'assistant', content: 'answer' },
      ], status: 'complete', stop, retry, regenerate, edit,
    } as unknown as ChatReturn)
    const view = render(<AgentChatNative definition={definition} />)
    fireEvent.click(screen.getByTestId('ak-retry'))
    fireEvent.click(screen.getByTestId('ak-regenerate'))
    fireEvent.click(screen.getByTestId('ak-edit'))
    useChat.mockReturnValue({
      messages: [
        { id: 'user-new', role: 'user', content: 'new' },
        { id: 'assistant-new', role: 'assistant', content: 'new answer' },
      ], status: 'complete', stop, retry, regenerate, edit,
    } as unknown as ChatReturn)
    view.rerender(<AgentChatNative definition={definition} />)
    fireEvent.change(screen.getByTestId('ak-edit-input'), { target: { value: 'changed' } })
    fireEvent.click(screen.getByTestId('ak-edit-save'))
    expect(retry).toHaveBeenCalledOnce()
    expect(regenerate).toHaveBeenCalledWith('assistant')
    expect(edit).toHaveBeenCalledWith('user', 'changed')
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
    await waitFor(() => expect(approve).toHaveBeenCalledOnce())
    expect(deny).not.toHaveBeenCalled()
  })
})
