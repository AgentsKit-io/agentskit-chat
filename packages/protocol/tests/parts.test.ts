import { expect, it } from 'vitest'
import { TurnEventSchema, createSnapshotEvent } from '../src/index.js'
const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'e', sessionId: 's', turnId: 't', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
it('extends v1 additively while rejecting inline binary and unknown part fields', () => {
  expect(TurnEventSchema.parse({ ...event, payload: { input: 'hello' } }).payload).toEqual({ input: 'hello' })
  const file = { type: 'file', ref: 'tenant/session/id', mimeType: 'image/png', sha256: 'a'.repeat(64), bytes: 100 }
  expect(TurnEventSchema.safeParse({ ...event, payload: { input: [{ type: 'text', text: 'look' }, file], capabilities: ['turn-parts-v1'] } }).success).toBe(true)
  expect(TurnEventSchema.safeParse({ ...event, payload: { input: [{ ...file, data: 'base64' }] } }).success).toBe(false)
  expect(TurnEventSchema.safeParse({ ...event, payload: { input: [] } }).success).toBe(false)
  const snapshot = createSnapshotEvent({ eventId: 'e', sessionId: 's', turnId: 't', sequence: 0, emittedAt: event.emittedAt, messages: [], status: 'idle', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, capabilities: ['turn-parts-v1'] })
  expect(snapshot.payload.capabilities).toEqual(['turn-parts-v1'])
})
