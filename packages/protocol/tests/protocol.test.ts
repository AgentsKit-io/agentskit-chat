import { describe, expect, it } from 'vitest'

import { invalidTurnEventFixtures, validTurnEventFixtures } from '../src/fixtures.js'
import {
  decodeTurnEvent,
  encodeTurnEvent,
  snapshotMessages,
  TURN_PROTOCOL,
} from '../src/index.js'

describe('v1 turn protocol', () => {
  it.each(validTurnEventFixtures)('accepts and round-trips $name', ({ event }) => {
    const decoded = decodeTurnEvent(encodeTurnEvent(event))
    expect(decoded).toEqual({ ok: true, event })
  })

  it.each(invalidTurnEventFixtures)('rejects $name inertly', ({ event, code }) => {
    const decoded = decodeTurnEvent(event)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.diagnostic.code).toBe(code)
      expect(decoded.diagnostic.retryable).toBe(false)
    }
  })

  it('strips additive unknown fields in a known v1 event', () => {
    const fixture = validTurnEventFixtures[0].event
    const decoded = decodeTurnEvent({ ...fixture, future: 'ignored', payload: { ...fixture.payload, future: true } })
    expect(decoded).toEqual({ ok: true, event: fixture })
  })

  it('strips additive structural fields from canonical message records', () => {
    const fixture = validTurnEventFixtures[3].event
    const source = fixture.payload.messages[0]!
    const messages = [{
      ...source,
      future: 'drop',
      parts: [{ type: 'text', text: 'hello', future: 'drop' }],
      toolCalls: source.toolCalls?.map(call => ({ ...call, future: 'drop' })),
    }]
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
    expect(decoded.event.payload.messages[0]).not.toHaveProperty('future')
    expect(decoded.event.payload.messages[0]?.parts?.[0]).not.toHaveProperty('future')
    expect(decoded.event.payload.messages[0]?.toolCalls?.[0]).not.toHaveProperty('future')
  })

  it('does not expose untrusted values or Zod issues in diagnostics', () => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, version: 1, eventId: 'safe', secret: 'do-not-leak' })
    expect(decoded).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
        eventId: 'safe',
      },
    })
  })

  it.each(['unsafe\nlog-entry', 'a'.repeat(129)])('does not echo an unsafe event id', (eventId) => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, version: 1, eventId })
    expect(decoded).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
      },
    })
  })

  it('classifies a missing version as an invalid payload', () => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, event: 'client.turn.submit' })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('PROTOCOL_INVALID_PAYLOAD')
  })

  it('rejects non-JSON metadata at the wire boundary', () => {
    const fixture = validTurnEventFixtures[2].event
    const messages = [{ ...fixture.payload.messages[0], metadata: { callback: () => 'unsafe' } }]
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })
    expect(decoded.ok).toBe(false)
  })

  it('rejects invalid JSON without throwing', () => {
    expect(decodeTurnEvent('{')).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event is not valid JSON.',
        retryable: false,
      },
    })
  })

  it('rejects a cyclic message graph without throwing', () => {
    const fixture = validTurnEventFixtures[2].event
    const metadata: Record<string, unknown> = {}
    metadata.self = metadata
    const messages = [{ ...fixture.payload.messages[0], metadata }]
    expect(() => decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })).not.toThrow()
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('rejects excessively deep message metadata without throwing', () => {
    const fixture = validTurnEventFixtures[2].event
    let metadata: Record<string, unknown> = {}
    for (let depth = 0; depth < 40; depth += 1) metadata = { nested: metadata }
    const messages = [{ ...fixture.payload.messages[0], metadata }]
    expect(() => decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })).not.toThrow()
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('rejects impossible calendar timestamps without normalization', () => {
    const fixture = validTurnEventFixtures[3].event
    const messages = [{ ...fixture.payload.messages[0], createdAt: '2026-02-30T00:00:00.000Z' }]
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it.each([
    { id: '' },
    { toolCalls: [{ id: '', name: 'lookup', args: {}, status: 'complete' }] },
    { toolCalls: [{ id: 'call-1', name: '', args: {}, status: 'complete' }] },
  ])('rejects empty canonical message and tool identities', (override) => {
    const fixture = validTurnEventFixtures[3].event
    const messages = [{ ...fixture.payload.messages[0], ...override }]
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('snapshots stateful message properties once', () => {
    const fixture = validTurnEventFixtures[3].event
    let reads = 0
    const message = { ...fixture.payload.messages[0] }
    Object.defineProperty(message, 'content', {
      enumerable: true,
      get: () => (++reads === 1 ? 'stable' : { unsafe: true }),
    })
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages: [message] } })
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
    expect(decoded.event.payload.messages[0]?.content).toBe('stable')
    expect(reads).toBe(1)
  })

  it('rejects hostile object access without throwing', () => {
    const input = new Proxy({}, { get: () => { throw new Error('blocked') } })
    expect(decodeTurnEvent(input)).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
      },
    })
  })

  it('restores canonical AgentsKit message dates from a snapshot', () => {
    const decoded = decodeTurnEvent(validTurnEventFixtures[2].event)
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.event.event === 'server.turn.snapshot') {
      const messages = snapshotMessages(decoded.event)
      expect(messages[0]?.createdAt).toBeInstanceOf(Date)
      expect(messages[0]?.content).toBe('AgentsKit')
    }
  })

  it('validates snapshots again at the message projection boundary', () => {
    expect(() => snapshotMessages({ event: 'server.turn.snapshot' })).toThrow()
  })
})
