import type { ChatReturn } from '@agentskit/core'
import { describe, expect, it, vi } from 'vitest'

import { createControlledChatDriver, parseControlledChatSnapshot } from '../src/index.js'
import { controlledSnapshotFixtures } from './fixtures/controlled-snapshots.js'

const snapshot = () => ({
  sessionId: 'synthetic-session',
  messages: [{
    id: 'assistant-1',
    role: 'assistant',
    content: 'Controlled answer',
    status: 'complete',
    createdAt: '2026-07-14T00:00:00.000Z',
  }],
  status: 'idle',
  input: 'draft',
  error: null,
  usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
})

const actions = (): Pick<ChatReturn, 'send' | 'stop' | 'retry' | 'edit' | 'regenerate' | 'setInput' | 'clear' | 'proposeToolCall' | 'approve' | 'deny'> => ({
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

describe('controlled chat driver', () => {
  it.each(Object.entries(controlledSnapshotFixtures))('accepts the synthetic %s conformance snapshot', (_name, fixture) => {
    expect(parseControlledChatSnapshot(fixture).sessionId).toBe('controlled-conformance')
  })

  it('validates the shell, delegates canonical messages upstream, and hydrates timestamps', () => {
    const input = snapshot()
    const parsed = parseControlledChatSnapshot(input)
    expect(parsed.sessionId).toBe('synthetic-session')
    expect(parsed.messages[0]?.createdAt).toEqual(new Date('2026-07-14T00:00:00.000Z'))
    expect(input.messages[0]?.createdAt).toBe('2026-07-14T00:00:00.000Z')
  })

  it('rejects unknown shell fields and invalid canonical messages', () => {
    expect(() => parseControlledChatSnapshot({ ...snapshot(), transport: 'private' })).toThrow()
    expect(() => parseControlledChatSnapshot({ ...snapshot(), status: 'waiting' })).toThrow()
    expect(() => parseControlledChatSnapshot({ ...snapshot(), messages: [{ ...snapshot().messages[0], role: 'owner' }] })).toThrow('Serialized message record is invalid')
  })

  it('preserves upstream token usage semantics without inventing a total formula', () => {
    expect(parseControlledChatSnapshot({
      ...snapshot(),
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 9 },
    }).usage.totalTokens).toBe(9)
    expect(() => parseControlledChatSnapshot({
      ...snapshot(),
      usage: { promptTokens: -1, completionTokens: 2, totalTokens: 1 },
    })).toThrow()
  })

  it('projects a ChatReturn-compatible driver and delegates every lifecycle action once', async () => {
    const callbacks = actions()
    const driver = createControlledChatDriver({ snapshot: snapshot(), actions: callbacks })

    driver.setInput('next')
    driver.stop()
    await driver.send('hello')
    await driver.retry()
    await driver.edit('assistant-1', 'edited', { regenerate: false })
    await driver.regenerate('assistant-1')
    await driver.clear()
    await driver.proposeToolCall({ id: 'call-1', name: 'synthetic-action', args: {} })
    await driver.approve('call-1')
    await driver.deny('call-1', 'not now')

    expect(callbacks.setInput).toHaveBeenCalledOnce()
    expect(callbacks.stop).toHaveBeenCalledOnce()
    expect(callbacks.send).toHaveBeenCalledOnce()
    expect(callbacks.retry).toHaveBeenCalledOnce()
    expect(callbacks.edit).toHaveBeenCalledOnce()
    expect(callbacks.regenerate).toHaveBeenCalledOnce()
    expect(callbacks.clear).toHaveBeenCalledOnce()
    expect(callbacks.proposeToolCall).toHaveBeenCalledOnce()
    expect(callbacks.approve).toHaveBeenCalledOnce()
    expect(callbacks.deny).toHaveBeenCalledOnce()
  })

  it('does not allow extra callback properties to overwrite validated state', () => {
    const callbacks = { ...actions(), status: 'private-state', sessionId: 'private-session' }
    const driver = createControlledChatDriver({ snapshot: snapshot(), actions: callbacks })
    expect(driver.status).toBe('idle')
    expect(driver.sessionId).toBe('synthetic-session')
  })
})
