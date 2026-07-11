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

  it('restores canonical AgentsKit message dates from a snapshot', () => {
    const decoded = decodeTurnEvent(validTurnEventFixtures[2].event)
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.event.event === 'server.turn.snapshot') {
      const messages = snapshotMessages(decoded.event)
      expect(messages[0]?.createdAt).toBeInstanceOf(Date)
      expect(messages[0]?.content).toBe('AgentsKit')
    }
  })
})
