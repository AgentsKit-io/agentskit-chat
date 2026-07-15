import type { ChatReturn } from '@agentskit/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const useChat = vi.hoisted(() => vi.fn())

vi.mock('@agentskit/react', async importOriginal => ({
  ...await importOriginal<typeof import('@agentskit/react')>(),
  useChat,
}))

import { ChoiceListComponent, defineChat, defineComponentManifest, StandardComponentCatalog, type ControlledChatSource } from '@agentskit/chat'
import { validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { controlledSnapshotFixtures } from '../../chat/tests/fixtures/controlled-snapshots.js'
import { AgentChat } from '../src/index.js'

const actions = (): ControlledChatSource['actions'] => ({
  send: vi.fn(async () => undefined),
  stop: vi.fn(),
  retry: vi.fn(async () => undefined),
  edit: vi.fn(async () => undefined),
  regenerate: vi.fn(async () => undefined),
  setInput: vi.fn(),
  clear: vi.fn(async () => undefined),
  proposeToolCall: vi.fn(async proposal => ({ ...proposal, status: 'requires_confirmation' })),
  approve: vi.fn(async () => undefined),
  deny: vi.fn(async () => undefined),
})

const source = (overrides: Record<string, unknown> = {}): ControlledChatSource => ({
  snapshot: {
    sessionId: 'react-controlled',
    messages: [{
      id: 'assistant-1', role: 'assistant', content: 'Host-owned answer', status: 'streaming', createdAt: '2026-07-14T00:00:00.000Z',
    }],
    status: 'streaming',
    input: 'draft',
    error: null,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    ...overrides,
  },
  actions: actions(),
})

afterEach(() => {
  cleanup()
  useChat.mockReset()
})

describe('controlled AgentChat', () => {
  it('renders host state and delegates input without invoking the upstream hook', () => {
    const controlled = source()
    render(<AgentChat definition={defineChat({ id: 'controlled', chat: { adapter: { createSource: vi.fn() } } })} controlled={controlled} />)

    expect(screen.getByText('Host-owned answer')).toBeTruthy()
    expect(screen.getByText('Thinking...')).toBeTruthy()
    expect(useChat).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(controlled.actions.stop).toHaveBeenCalledOnce()
  })

  it('updates and submits controlled input through host callbacks', () => {
    const controlled = source({ status: 'idle' })
    render(<AgentChat definition={defineChat({ id: 'controlled-input', chat: { adapter: { createSource: vi.fn() } } })} controlled={controlled} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'next question' } })
    expect(controlled.actions.setInput).toHaveBeenCalledWith('next question')
    fireEvent.submit(input.closest('form')!)
    expect(controlled.actions.send).toHaveBeenCalledWith('draft')
  })

  it('fails closed when the controlled snapshot is invalid', () => {
    const controlled = source({ status: 'private-state' })
    expect(() => render(<AgentChat definition={defineChat({ id: 'invalid-controlled', chat: { adapter: { createSource: vi.fn() } } })} controlled={controlled} />)).toThrow()
    expect(useChat).not.toHaveBeenCalled()
  })

  it('renders host errors and delegates retry failures to the shared accessible error path', async () => {
    const hostError = source({
      ...controlledSnapshotFixtures.error,
      sessionId: 'react-error',
      messages: [],
    })
    const errorView = render(<AgentChat definition={defineChat({ id: 'controlled-error', chat: { adapter: { createSource: vi.fn() } } })} controlled={hostError} />)
    expect(screen.getByRole('alert').textContent).toContain('Synthetic host failure.')
    errorView.unmount()

    const base = source({
      sessionId: 'react-retry-error',
      status: 'complete',
      error: null,
      messages: [
        { id: 'user-error', role: 'user', content: 'Retry me', status: 'complete', createdAt: '2026-07-14T00:00:00.000Z' },
        { id: 'assistant-error', role: 'assistant', content: 'Synthetic failure', status: 'error', createdAt: '2026-07-14T00:00:01.000Z' },
      ],
    })
    const controlled: ControlledChatSource = {
      ...base,
      actions: { ...base.actions, retry: vi.fn(async () => { throw new Error('Synthetic retry failed.') }) },
    }
    render(<AgentChat definition={defineChat({ id: 'controlled-retry-error', chat: { adapter: { createSource: vi.fn() } } })} controlled={controlled} />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Synthetic retry failed.'))
  })

  it('renders confirmation and semantic component fixtures through the shared presentation', () => {
    const confirmation = source({ ...controlledSnapshotFixtures.confirmation, sessionId: 'react-confirmation' })
    const confirmationView = render(<AgentChat definition={defineChat({ id: 'controlled-confirmation', chat: { adapter: { createSource: vi.fn() } } })} controlled={confirmation} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(confirmation.actions.approve).toHaveBeenCalledWith('synthetic-call')
    confirmationView.unmount()

    const semantic = source({ ...controlledSnapshotFixtures.semanticComponent, sessionId: 'react-semantic' })
    render(<AgentChat
      definition={defineChat({ id: 'controlled-semantic', chat: { adapter: { createSource: vi.fn() } }, components: defineComponentManifest(StandardComponentCatalog) })}
      controlled={semantic}
    />)
    expect(screen.getByRole('link', { name: 'Public guide' })).toBeTruthy()
  })

  it('delegates a controlled component action through the host proposal callback', async () => {
    const actionable = {
      ...validChoiceListFrame,
      instanceId: 'controlled-action-choice',
      props: {
        ...validChoiceListFrame.props,
        choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs'
          ? { ...choice, action: { name: 'synthetic-action', input: { target: 'public-guide' } } }
          : choice),
      },
    }
    const controlled = source({
      status: 'complete',
      messages: [{
        id: 'controlled-action-message', role: 'assistant', content: JSON.stringify(actionable), status: 'complete', createdAt: '2026-07-14T00:00:00.000Z',
      }],
    })
    render(<AgentChat
      definition={defineChat({ id: 'controlled-action', chat: { adapter: { createSource: vi.fn() } }, components: defineComponentManifest([ChoiceListComponent]) })}
      controlled={controlled}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Documentation/ }))
    await waitFor(() => expect(controlled.actions.proposeToolCall).toHaveBeenCalledWith(expect.objectContaining({
      name: 'synthetic-action', args: { target: 'public-guide' },
    })))
  })

  it('remounts local presentation state when the controlled session identity changes', () => {
    const first = source({ sessionId: 'controlled-first', status: 'idle', messages: [
      { id: 'user-1', role: 'user', content: 'First question', status: 'complete', createdAt: '2026-07-14T00:00:00.000Z' },
      { id: 'assistant-1', role: 'assistant', content: 'First answer', status: 'complete', createdAt: '2026-07-14T00:00:01.000Z' },
    ] })
    const view = render(<AgentChat definition={defineChat({ id: 'controlled-remount', chat: { adapter: { createSource: vi.fn() } } })} controlled={first} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit last message' }))
    expect(screen.getByRole('textbox', { name: 'Edit message' })).toBeTruthy()

    view.rerender(<AgentChat definition={defineChat({ id: 'controlled-remount', chat: { adapter: { createSource: vi.fn() } } })} controlled={source({ sessionId: 'controlled-second', status: 'idle', messages: [] })} />)
    expect(screen.queryByRole('textbox', { name: 'Edit message' })).toBeNull()
  })
})
