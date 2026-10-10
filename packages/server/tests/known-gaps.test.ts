import type { AdapterFactory } from '@agentskit/core'
import { describe, expect, it } from 'vitest'
import { createChatHandler } from '../src/index.js'

const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }
const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'known-gap', turnId: 'turn', sequence: 0,
  emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }
const handler = createChatHandler({ resolveDefinition: () => ({ id: 'gap', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }) })
const post = (body: unknown) => handler(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))

describe('Track 04 stage 9 — referenced parts', () => {
  it('stage 9: referenced image parts are accepted and reach the adapter', async () => {
    const bytes = new TextEncoder().encode('image')
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('')
    const ref = 'tenant/known-gap/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const store = { presignPut: async () => ({ url: 'https://storage.invalid/put', headers: {} }), read: async () => new Response(bytes, { headers: { 'content-type': 'image/png' } }), presignGet: async () => 'https://storage.invalid/get' }
    const sources: unknown[] = []
    const seeing: AdapterFactory = { createSource: input => { sources.push(input.messages.find(message => message.role === 'user')?.parts?.[0]); return { async *stream() { yield { type: 'done' } }, abort() {} } } }
    const withUploads = createChatHandler({ resolveDefinition: () => ({ id: 'gap', chat: { adapter: seeing } }), sessionStorage: () => ({ load: () => undefined, save: () => true }),
      uploads: { store, maxBytes: 1024, mimeTypes: ['image/png'], tenantId: () => 'tenant' } })
    const result = await withUploads(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...event, payload: { input: [{ type: 'file', ref, mimeType: 'image/png', sha256, bytes: bytes.length }], capabilities: ['turn-parts-v1'] } }) }))
    expect(result.status).toBe(200)
    await result.text()
    expect(sources).toEqual([{ type: 'image', source: 'https://storage.invalid/get', mimeType: 'image/png' }])
  })
  it('records current 400 REQUEST_INVALID_EVENT for inline image parts', async () => {
    const result = await post({ ...event, payload: { input: [{ type: 'image', source: 's3://test/image' }] } })
    expect(result.status).toBe(400)
    expect(await result.json()).toMatchObject({ error: { code: 'REQUEST_INVALID_EVENT' } })
  })
  it('preserves the 413 limit for inline image uploads; stage 9 must use references', async () => {
    const result = await post({ ...event, payload: { input: 'x'.repeat(65536) } })
    expect(result.status).toBe(413)
    expect(await result.json()).toMatchObject({ error: { code: 'REQUEST_TOO_LARGE' } })
  })
})
