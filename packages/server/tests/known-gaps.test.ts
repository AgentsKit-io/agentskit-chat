import { createChatController } from '@agentskit/core'
import type { AdapterFactory, Message } from '@agentskit/core'
import { describe, expect, it } from 'vitest'
import { createChatHandler } from '../src/index.js'

const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }
const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'known-gap', turnId: 'turn', sequence: 0,
  emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }
const handler = createChatHandler({ resolveDefinition: () => ({ id: 'gap', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }) })
const post = (body: unknown) => handler(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))

describe('Known gaps — track 04 stages 3 and 9 (remove fails when supported)', () => {
  it.fails('stage 3: approval in another request must execute and resume via the public handler', async () => {
    const result = await post({ ...event, event: 'client.action.decide', payload: { token: 'confirm-persisted', decision: 'approve' } })
    expect(result.status).toBe(200)
  })
  it.fails('stage 3: independent approve controllers must write exactly once', async () => {
    let writes = 0
    const pending: Message[] = [{ id: 'proposal', role: 'assistant', content: '', status: 'complete', createdAt: new Date(),
      toolCalls: [{ id: 'write-call', name: 'write', args: {}, status: 'requires_confirmation' }] }]
    const make = () => createChatController({ adapter, initialMessages: structuredClone(pending),
      tools: [{ name: 'write', requiresConfirmation: true, execute: async () => { writes++; return 'saved' } }] })
    await Promise.all([make().approve('write-call'), make().approve('write-call')])
    expect(writes).toBe(1)
  })
  it.fails('stage 9: referenced image parts must be accepted (currently 400)', async () => {
    const result = await post({ ...event, payload: { input: [{ type: 'file', ref: 's3://test/image', mimeType: 'image/png', sha256: 'a'.repeat(64), bytes: 100 }] } })
    expect(result.status).toBe(200)
  })
  it('records current 400 REQUEST_INVALID_EVENT for image parts and decisions', async () => {
    for (const body of [
      { ...event, payload: { input: [{ type: 'image', source: 's3://test/image' }] } },
      { ...event, event: 'client.action.decide', payload: { token: 'confirm-persisted', decision: 'approve' } },
    ]) {
      const result = await post(body)
      expect(result.status).toBe(400)
      expect(await result.json()).toMatchObject({ error: { code: 'REQUEST_INVALID_EVENT' } })
    }
  })
  it('preserves the 413 limit for inline image uploads; stage 9 must use references', async () => {
    const result = await post({ ...event, payload: { input: 'x'.repeat(65536) } })
    expect(result.status).toBe(413)
    expect(await result.json()).toMatchObject({ error: { code: 'REQUEST_TOO_LARGE' } })
  })
  // Spike used core 1.14.1 (approvalGenerations guard); this repo pins 1.12.x, which replays
  // restored calls but lacks durable claiming. Re-run this exact core symptom after adoption.
  it.skip('stage 3: core 1.14.1 approve after controller restart is a silent no-op (spike scenario 3)', () => {})
})
