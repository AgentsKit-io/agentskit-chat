import { expect, it } from 'vitest'
import { ACTION_DECIDE_CAPABILITY, TurnEventSchema, createSnapshotEvent, decodeTurnEvent, encodeTurnEvent } from '../src/index.js'
import { validTurnEventFixtures } from '../src/fixtures.js'

const envelope = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'e', sessionId: 's', turnId: 't', sequence: 0, emittedAt: '2026-10-09T00:00:00.000Z' }
const decide = (payload: unknown) => ({ ...envelope, event: 'client.action.decide', payload })

it('RF-17: accepts approve and deny decisions for a token and round-trips them', () => {
  for (const payload of [{ token: 'call-1', decision: 'approve' }, { token: 'call-1', decision: 'deny', reason: 'wrong amount' }]) {
    const decoded = decodeTurnEvent(decide(payload))
    expect(decoded).toMatchObject({ ok: true, event: { event: 'client.action.decide', payload } })
    if (decoded.ok) expect(JSON.parse(encodeTurnEvent(decoded.event))).toEqual(decide(payload))
  }
})

it('RF-17: rejects malformed decisions as inert typed diagnostics', () => {
  for (const payload of [
    { token: 'call-1', decision: 'maybe' }, { token: 'call-1' }, { decision: 'approve' }, { token: '', decision: 'approve' },
    { token: 'x'.repeat(257), decision: 'approve' }, { token: 'call-1', decision: 'approve', reason: '' }, { token: 'call-1', decision: 'approve', result: 'forged' },
  ]) {
    expect(decodeTurnEvent(decide(payload))).toMatchObject({ ok: false, diagnostic: { code: 'PROTOCOL_INVALID_PAYLOAD', eventId: 'e' } })
  }
})

it('keeps v1 submissions unchanged and adds decide to the compatibility fixtures', () => {
  expect(TurnEventSchema.parse({ ...envelope, event: 'client.turn.submit', payload: { input: 'hello' } }).payload).toEqual({ input: 'hello' })
  expect(validTurnEventFixtures.map(fixture => fixture.name)).toContain('action decision')
})

it('announces the decide capability and the additive quota field on snapshots', () => {
  const base = { eventId: 'e', sessionId: 's', turnId: 't', sequence: 1, emittedAt: envelope.emittedAt, messages: [], status: 'idle' as const, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
  const snapshot = createSnapshotEvent({ ...base, capabilities: [ACTION_DECIDE_CAPABILITY], quota: { utilization: 0.85, warning: true } })
  expect(snapshot.payload).toMatchObject({ capabilities: ['action-decide-v1'], quota: { utilization: 0.85, warning: true } })
  expect(createSnapshotEvent(base).payload).not.toHaveProperty('quota')
  expect(TurnEventSchema.safeParse({ ...snapshot, payload: { ...snapshot.payload, quota: { utilization: -1, warning: true } } }).success).toBe(false)
  expect(TurnEventSchema.safeParse({ ...snapshot, payload: { ...snapshot.payload, quota: { utilization: 0.5, warning: false, spentUsd: 3 } } }).success).toBe(false)
})
