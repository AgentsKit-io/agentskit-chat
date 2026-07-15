import { render } from 'ink-testing-library'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const useChat = vi.hoisted(() => vi.fn())

vi.mock('@agentskit/ink', async importOriginal => ({
  ...await importOriginal<typeof import('@agentskit/ink')>(),
  useChat,
}))

import { defineChat, defineComponentManifest, StandardComponentCatalog, type ControlledChatSource } from '@agentskit/chat'
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
    ...controlledSnapshotFixtures.idle,
    sessionId: 'ink-controlled',
    ...overrides,
  },
  actions: actions(),
})

const definition = (id: string, components = false) => defineChat({
  id,
  chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'done' as const } }, abort() {} }) } },
  ...(components ? { components: defineComponentManifest(StandardComponentCatalog) } : {}),
})

afterEach(() => {
  vi.restoreAllMocks()
  useChat.mockReset()
})

describe('controlled Ink AgentChat', () => {
  it('renders streaming host state and delegates Escape without invoking useChat', async () => {
    const controlled = source({ ...controlledSnapshotFixtures.streaming, sessionId: 'ink-streaming' })
    const view = render(<AgentChat definition={definition('controlled-stream')} controlled={controlled} />)
    expect(view.lastFrame()).toContain('Synthetic stream')
    expect(view.lastFrame()).toContain('press Esc to stop')
    view.stdin.write('\u001b')
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(controlled.actions.stop).toHaveBeenCalledOnce()
    expect(useChat).not.toHaveBeenCalled()
    view.unmount()
  })

  it('delegates terminal input and lifecycle commands to host callbacks', async () => {
    const input = source({ input: 'draft' })
    const inputView = render(<AgentChat definition={definition('controlled-input')} controlled={input} />)
    inputView.stdin.write('\r')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(input.actions.send).toHaveBeenCalledWith('draft')
    inputView.unmount()

    const lifecycle = source({
      input: '/retry',
      messages: [
        { id: 'user-1', role: 'user', content: 'Question', status: 'complete', createdAt: '2026-07-14T00:00:00.000Z' },
        { id: 'assistant-1', role: 'assistant', content: 'Answer', status: 'complete', createdAt: '2026-07-14T00:00:01.000Z' },
      ],
    })
    const lifecycleView = render(<AgentChat definition={definition('controlled-lifecycle')} controlled={lifecycle} />)
    lifecycleView.stdin.write('\r')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(lifecycle.actions.retry).toHaveBeenCalledOnce()
    expect(lifecycle.actions.setInput).toHaveBeenCalledWith('')
    lifecycleView.unmount()
  })

  it('delegates confirmation and semantic component interaction through the host', () => {
    const confirmation = source({ ...controlledSnapshotFixtures.confirmation, sessionId: 'ink-confirmation' })
    const confirmationView = render(<AgentChat definition={definition('controlled-confirmation')} controlled={confirmation} />)
    confirmationView.stdin.write('1')
    expect(confirmation.actions.approve).toHaveBeenCalledWith('synthetic-call')
    confirmationView.unmount()

    const denial = source({ ...controlledSnapshotFixtures.confirmation, sessionId: 'ink-denial' })
    const denialView = render(<AgentChat definition={definition('controlled-denial')} controlled={denial} />)
    denialView.stdin.write('3')
    expect(denial.actions.deny).toHaveBeenCalledWith('synthetic-call', undefined)
    denialView.unmount()

    const semantic = source({ ...controlledSnapshotFixtures.semanticComponent, sessionId: 'ink-semantic' })
    const onInteract = vi.fn()
    const semanticView = render(<AgentChat definition={definition('controlled-semantic', true)} controlled={semantic} onComponentInteract={onInteract} />)
    expect(semanticView.lastFrame()).toContain('Synthetic sources')
    semanticView.stdin.write('\r')
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'synthetic-sources', event: 'open' }))
    semanticView.unmount()
  })

  it('renders the shared controlled error fixture', () => {
    const controlled = source({ ...controlledSnapshotFixtures.error, sessionId: 'ink-error' })
    const view = render(<AgentChat definition={definition('controlled-error')} controlled={controlled} />)
    expect(view.lastFrame()).toContain('Synthetic host failure.')
    expect(useChat).not.toHaveBeenCalled()
    view.unmount()
  })

  it('keeps only the latest unresolved controlled interaction active', () => {
    const frame = JSON.parse(controlledSnapshotFixtures.semanticComponent.messages[0].content) as Record<string, unknown>
    const controlled = source({
      status: 'complete',
      messages: [
        { id: 'first', role: 'assistant', content: JSON.stringify({ ...frame, instanceId: 'first-source' }), status: 'complete', createdAt: '2026-07-14T00:00:00.000Z' },
        { id: 'second', role: 'assistant', content: JSON.stringify({ ...frame, instanceId: 'second-source' }), status: 'complete', createdAt: '2026-07-14T00:00:01.000Z' },
      ],
    })
    const onInteract = vi.fn()
    const view = render(<AgentChat definition={definition('controlled-focus', true)} controlled={controlled} onComponentInteract={onInteract} />)
    view.stdin.write('\r')
    expect(onInteract).toHaveBeenCalledOnce()
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'second-source' }))
    view.unmount()
  })

  it('fails closed for an invalid controlled snapshot', () => {
    const controlled = source({ status: 'private-state' })
    const view = render(<AgentChat definition={definition('controlled-invalid')} controlled={controlled} />)
    expect(view.lastFrame()?.trim()).toBe('')
    expect(useChat).not.toHaveBeenCalled()
    view.unmount()
  })
})
