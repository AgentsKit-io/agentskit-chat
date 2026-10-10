import { AwsClient } from 'aws4fetch'
import { describe, expect, it } from 'vitest'
import { createS3BlobStore, createUploadHandler, deliverUploadParts, resolveUploadParts } from '../src/uploads.js'
import type { BlobStore } from '../src/uploads.js'
import { createChatHandler } from '../src/index.js'
import type { AdapterFactory, Message } from '@agentskit/core'

const bytes = new TextEncoder().encode('local upload')
const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('')
const ref = 'tenant/session/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const part = { type: 'file' as const, ref, mimeType: 'image/png', bytes: bytes.length, sha256 }
const store: BlobStore = {
  presignPut: async () => ({ url: 'https://storage.invalid/signed', headers: {} }),
  read: async () => new Response(bytes, { headers: { 'content-type': 'image/png' } }),
  presignGet: async () => 'https://storage.invalid/short',
}
const policy = { store, maxBytes: 1024, mimeTypes: ['image/png'] }
const upload = createUploadHandler({ ...policy, authorize: async () => ({ tenantId: 'tenant' }) })
const request = (body: unknown) => new Request('http://localhost/uploads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const metadata = { sessionId: 'session', bytes: bytes.length, mimeType: 'image/png' }

describe('upload reference policy', () => {
  it('presigns references and rejects inline data, size/type violations and unauthenticated requests', async () => {
    expect((await upload(request(metadata))).status).toBe(201)
    expect((await upload(request({ ...metadata, data: 'base64' }))).status).toBe(400)
    expect((await upload(request({ ...metadata, bytes: 1025 }))).status).toBe(413)
    expect((await upload(request({ ...metadata, mimeType: 'text/html' }))).status).toBe(415)
    expect((await upload(request({ ...metadata, sessionId: '../escape' }))).status).toBe(400)
    expect((await upload(request({ ...metadata, sessionId: 'x'.repeat(65536) }))).status).toBe(413)
  })
  it('verifies bytes, MIME and digest, and rejects cross-tenant/session references before reading', async () => {
    await expect(resolveUploadParts(policy, 'tenant', 'session', [part], AbortSignal.timeout(1000))).resolves.toEqual([part])
    for (const scope of [['other', 'session'], ['tenant', 'other']]) {
      await expect(resolveUploadParts(policy, scope[0]!, scope[1]!, [part], AbortSignal.timeout(1000))).rejects.toMatchObject({ status: 403 })
    }
    await expect(resolveUploadParts(policy, 'tenant', 'session', [{ ...part, sha256: '0'.repeat(64) }], AbortSignal.timeout(1000))).rejects.toMatchObject({ status: 422, code: 'UPLOAD_CHECKSUM_MISMATCH' })
    await expect(resolveUploadParts(policy, 'tenant', 'session', [{ ...part, bytes: 1 }], AbortSignal.timeout(1000))).rejects.toMatchObject({ status: 413 })
  })
  it('preserves string turns and rejects unnegotiated, cross-tenant and mismatched parts', async () => {
    const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }), uploads: { ...policy, tenantId: () => 'tenant' } })
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
    const post = (payload: unknown) => handler(request({ ...event, payload }))
    const legacy = await post({ input: 'hello' }); expect(legacy.status).toBe(200); expect(await legacy.text()).toContain('"capabilities":["turn-parts-v1"]')
    expect((await post({ input: [part] })).status).toBe(400)
    expect((await post({ input: [{ ...part, ref: ref.replace('tenant', 'other') }], capabilities: ['turn-parts-v1'] })).status).toBe(403)
    expect((await post({ input: [{ ...part, sha256: '0'.repeat(64) }], capabilities: ['turn-parts-v1'] })).status).toBe(422)
  })
})

const endpoint = process.env.CHD_S3_ENDPOINT
// Synthetic local fixture identity (also MinIO's default); never uses cloud credentials.
describe.skipIf(!endpoint)('BlobStore contract against local S3-compatible storage', () => {
  it('performs signed PUT/GET, bounded expiry and reference verification against the real object', async () => {
    const client = new AwsClient({ accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin', service: 's3', region: 'us-east-1' })
    const bucket = 'chd-contract'
    const create = await client.fetch(`${endpoint}/${bucket}`, { method: 'PUT' })
    expect([200, 409]).toContain(create.status)
    const storage = createS3BlobStore({ endpoint: endpoint!, bucket, region: 'us-east-1', accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' })
    const signal = AbortSignal.timeout(10_000)
    const localUpload = createUploadHandler({ ...policy, store: storage, authorize: async () => ({ tenantId: 'tenant' }) })
    const response = await localUpload(request(metadata)); expect(response.status).toBe(201)
    const result = await response.json() as { ref: string; url: string; headers: Record<string, string> }
    expect(new URL(result.url).searchParams.get('X-Amz-Expires')).toBe('300')
    expect(result.headers['content-length']).toBe(String(bytes.length))
    const put = await fetch(result.url, { method: 'PUT', headers: result.headers, body: bytes, signal }); expect(put.status).toBe(200)
    const realPart = { ...part, ref: result.ref }
    await expect(resolveUploadParts({ ...policy, store: storage }, 'tenant', 'session', [realPart], signal)).resolves.toEqual([realPart])
    await expect(resolveUploadParts({ ...policy, store: storage }, 'other', 'session', [realPart], signal)).rejects.toMatchObject({ status: 403 })
    await expect(resolveUploadParts({ ...policy, store: storage }, 'tenant', 'session', [{ ...realPart, sha256: '0'.repeat(64) }], signal)).rejects.toMatchObject({ status: 422 })
    const get = await fetch(await storage.presignGet(result.ref, 60, signal)); expect(await get.text()).toBe('local upload')
  }, 30_000)
  it('RF-11: the adapter can fetch the delivered signed URL, or receives the stored bytes', async () => {
    const client = new AwsClient({ accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin', service: 's3', region: 'us-east-1' })
    const bucket = 'chd-contract'
    expect([200, 409]).toContain((await client.fetch(`${endpoint}/${bucket}`, { method: 'PUT' })).status)
    const storage = createS3BlobStore({ endpoint: endpoint!, bucket, region: 'us-east-1', accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' })
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
    for (const delivery of ['url', 'bytes'] as const) {
      const uploaded = await (await createUploadHandler({ ...policy, store: storage, authorize: async () => ({ tenantId: 'tenant' }) })(request(metadata))).json() as { ref: string; url: string; headers: Record<string, string> }
      expect((await fetch(uploaded.url, { method: 'PUT', headers: uploaded.headers, body: bytes })).status).toBe(200)
      const sources: string[] = []
      const adapter: AdapterFactory = { createSource: input => {
        const source = input.messages.find(message => message.role === 'user')?.parts?.[0]
        if (source && source.type !== 'text') sources.push(source.source)
        return { async *stream() { yield { type: 'done' } }, abort() {} }
      } }
      const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }),
        uploads: { ...policy, store: storage, delivery, expiresIn: 60, tenantId: () => 'tenant' } })
      const response = await handler(request({ ...event, turnId: `turn-${delivery}`, payload: { input: [{ ...part, ref: uploaded.ref }], capabilities: ['turn-parts-v1'] } }))
      expect(response.status).toBe(200)
      expect(await response.text()).not.toContain('X-Amz-Signature')
      expect(sources).toHaveLength(1)
      if (delivery === 'bytes') { expect(sources[0]).toBe(`data:image/png;base64,${btoa('local upload')}`); continue }
      const signed = new URL(sources[0]!)
      expect(signed.searchParams.get('X-Amz-Expires')).toBe('60')
      const fetched = await fetch(signed)
      expect(fetched.status).toBe(200)
      expect(await fetched.text()).toBe('local upload')
      signed.searchParams.set('X-Amz-Signature', '0'.repeat(64))
      expect((await fetch(signed)).status).toBe(403)
    }
  }, 30_000)
})

const workerUrl = process.env.CHD_WRANGLER_URL
describe.skipIf(!workerUrl)('real wrangler dev HTTP flow', () => {
  it('presigns and validates uploads through workerd, preserving tenant isolation and fetching the delivered URL', async () => {
    const post = (path: string, body: unknown, tenant = 'tenant') => fetch(`${workerUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-tenant': tenant }, body: JSON.stringify(body) })
    const uploadResponse = await post('/uploads', metadata); expect(uploadResponse.status).toBe(201)
    const result = await uploadResponse.json() as { ref: string; url: string; headers: Record<string, string> }
    expect((await fetch(result.url, { method: 'PUT', headers: result.headers, body: bytes })).status).toBe(200)
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
    const realPart = { ...part, ref: result.ref }
    const body = { ...event, payload: { input: [realPart], capabilities: ['turn-parts-v1'] } }
    expect((await post('/chat', body, 'other')).status).toBe(403)
    expect((await post('/chat', { ...body, payload: { ...body.payload, input: [{ ...realPart, sha256: '0'.repeat(64) }] } })).status).toBe(422)
    const delivered = await post('/chat', body); expect(delivered.status).toBe(200)
    const transcript = await delivered.text()
    expect(transcript).toContain('local upload')
    expect(transcript).not.toContain('X-Amz-Signature')
    expect((await post('/uploads', { ...metadata, bytes: 1025 })).status).toBe(413)
    expect((await post('/uploads', { ...metadata, mimeType: 'text/html' })).status).toBe(415)
    expect((await post('/uploads', { ...metadata, sessionId: 'forbidden' })).status).toBe(403)
    const legacy = await post('/chat', { ...event, payload: { input: 'hello' } }); expect(legacy.status).toBe(200); await legacy.text()
  }, 30_000)
})

describe('upload trust boundary and recovery', () => {
  it('rejects malformed metadata, unsupported methods and invalid configuration', async () => {
    for (const body of [null, [], 'binary', { ...metadata, bytes: 0 }, { ...metadata, bytes: '12' }, { ...metadata, mimeType: null }]) {
      expect((await upload(request(body))).status).toBe(body && typeof body === 'object' && !Array.isArray(body) && 'mimeType' in body && body.mimeType === null ? 415 : 400)
    }
    expect((await upload(new Request('http://localhost/uploads'))).status).toBe(405)
    expect((await upload(new Request('http://localhost/uploads', { method: 'POST', body: '{}' }))).status).toBe(415)
    expect((await upload(new Request('http://localhost/uploads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status).toBe(400)
    for (const overrides of [{ maxBytes: 0 }, { mimeTypes: [] }, { expiresIn: 601 }, { expiresIn: 0 }, { timeoutMs: 0 }]) {
      expect(() => createUploadHandler({ ...policy, ...overrides, authorize: async () => ({ tenantId: 'tenant' }) })).toThrow()
    }
    const defaultExpiry = createUploadHandler({ ...policy, expiresIn: 60, authorize: async () => ({ tenantId: 'tenant' }) })
    expect(await (await defaultExpiry(request(metadata))).json()).toMatchObject({ expiresIn: 60 })
  })
  it('reports authorization and storage failures safely and times out stalled callbacks', async () => {
    const denied = createUploadHandler({ ...policy, authorize: async () => ({ tenantId: '../escape' }) })
    expect((await denied(request(metadata))).status).toBe(403)
    const broken = createUploadHandler({ ...policy, authorize: async () => { throw new Error('internal detail') } })
    const result = await broken(request(metadata)); expect(result.status).toBe(500); expect(await result.text()).not.toContain('internal detail')
    const stalled = createUploadHandler({ ...policy, timeoutMs: 10, authorize: async () => new Promise(() => {}) })
    expect((await stalled(request(metadata))).status).toBe(408)
    const invalidStorage = createS3BlobStore
    const config = { endpoint: 'http://localhost', bucket: 'test', region: 'local', accessKeyId: 'fixture', secretAccessKey: 'fixture' }
    expect(() => invalidStorage({ ...config, secretAccessKey: 'bad\nvalue' })).toThrow()
    expect(() => invalidStorage({ ...config, endpoint: 'http://user:password@localhost' })).toThrow()
    expect(() => invalidStorage({ ...config, endpoint: 'file:///tmp' })).toThrow()
    await expect(invalidStorage(config).presignGet(ref, 601, AbortSignal.timeout(1000))).rejects.toMatchObject({ code: 'UPLOAD_CONFIG_INVALID' })
  })
  it('rejects unavailable, truncated, mistyped and malformed references without accepting partial bytes', async () => {
    for (const response of [new Response(null, { status: 404 }), new Response(null), new Response(bytes.slice(0, 1), { headers: { 'content-type': 'image/png' } }), new Response(bytes, { headers: { 'content-type': 'text/html' } })]) {
      await expect(resolveUploadParts({ ...policy, store: { ...store, read: async () => response } }, 'tenant', 'session', [part], AbortSignal.timeout(1000))).rejects.toMatchObject({ status: 422 })
    }
    await expect(resolveUploadParts(policy, 'tenant', 'session', [{ ...part, ref: 'tenant/session/../escape' }], AbortSignal.timeout(1000))).rejects.toMatchObject({ status: 403 })
    await expect(resolveUploadParts(policy, 'tenant', 'session', [{ type: 'text', text: 'hello' }], AbortSignal.timeout(1000))).resolves.toEqual([{ type: 'text', text: 'hello' }])
  })
})

describe('upload failure contracts', () => {
  it('rejects invalid declared metadata before touching storage', async () => {
    let reads = 0
    const guarded = { ...policy, store: { ...store, read: async () => { reads++; return new Response(bytes) } } }
    for (const [candidate, status, code] of [
      [{ ...part, bytes: 0 }, 400, 'UPLOAD_INVALID_METADATA'],
      [{ ...part, bytes: 1.5 }, 400, 'UPLOAD_INVALID_METADATA'],
      [{ ...part, bytes: 1025 }, 413, 'UPLOAD_TOO_LARGE'],
      [{ ...part, mimeType: 'text/html' }, 415, 'UPLOAD_UNSUPPORTED_TYPE'],
      [{ ...part, ref: ref.replace('tenant', 'other') }, 403, 'UPLOAD_REFERENCE_FORBIDDEN'],
      [{ ...part, ref: ref.replace('session', 'other') }, 403, 'UPLOAD_REFERENCE_FORBIDDEN'],
    ] as const) {
      await expect(resolveUploadParts(guarded, 'tenant', 'session', [candidate], new AbortController().signal)).rejects.toMatchObject({ status, code })
    }
    expect(reads).toBe(0)
  })

  it('propagates read failures and cancels a failed object stream', async () => {
    const failure = new Error('storage unavailable')
    await expect(resolveUploadParts({ ...policy, store: { ...store, read: async () => { throw failure } } }, 'tenant', 'session', [part], new AbortController().signal)).rejects.toBe(failure)
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(bytes) }, cancel() { cancelled = true } })
    await expect(resolveUploadParts({ ...policy, store: { ...store, read: async () => new Response(body) } }, 'tenant', 'session', [{ ...part, bytes: 1 }], new AbortController().signal)).rejects.toMatchObject({ status: 413, code: 'UPLOAD_TOO_LARGE' })
    expect(cancelled).toBe(true)
    expect(body.locked).toBe(false)
    const aborted = AbortSignal.abort(failure)
    await expect(resolveUploadParts(policy, 'tenant', 'session', [part], aborted)).rejects.toBe(failure)
  })

  it('returns safe retryable diagnostics for PUT signing failures', async () => {
    const handler = createUploadHandler({ ...policy, authorize: async () => ({ tenantId: 'tenant' }), store: { ...store, presignPut: async () => { throw new Error('private storage detail') } } })
    const response = await handler(request(metadata))
    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: { version: 1, code: 'UPLOAD_FAILED', message: 'Upload request failed.', retryable: true } })
  })

  it('signs PUT and GET with encoded paths, MIME, exact size and bounded lifetimes', async () => {
    const storage = createS3BlobStore({ endpoint: 'https://storage.invalid/base/', bucket: 'test bucket', region: 'local', accessKeyId: 'fixture', secretAccessKey: 'fixture' })
    const signal = new AbortController().signal
    const put = await storage.presignPut(ref, { bytes: bytes.length, mimeType: 'image/png', expiresIn: 60 }, signal)
    const target = new URL(put.url)
    expect(target.pathname).toBe(`/base/test%20bucket/${ref}`)
    expect(target.searchParams.get('X-Amz-Expires')).toBe('60')
    expect(target.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
    expect(target.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(put.headers).toEqual({ 'content-type': 'image/png', 'content-length': String(bytes.length) })
    const get = new URL(await storage.presignGet(ref, 600, signal))
    expect(get.searchParams.get('X-Amz-Expires')).toBe('600')
    expect(get.searchParams.get('X-Amz-SignedHeaders')).toBe('host')
    for (const expiresIn of [0, -1, 1.5, 601, NaN]) {
      await expect(storage.presignGet(ref, expiresIn, signal)).rejects.toMatchObject({ code: 'UPLOAD_CONFIG_INVALID' })
      await expect(storage.presignPut(ref, { ...metadata, expiresIn }, signal)).rejects.toMatchObject({ code: 'UPLOAD_CONFIG_INVALID' })
    }
    await expect(storage.presignGet(ref, 60, AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('keeps parts disabled without upload policy, advertises nothing and never starts the adapter', async () => {
    let starts = 0
    const adapter: AdapterFactory = { createSource: () => { starts++; return { async *stream() { yield { type: 'done' } }, abort() {} } } }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }) })
    const response = await handler(request({ protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit', payload: { input: [part], capabilities: ['turn-parts-v1'] } }))
    expect(response.status).toBe(501)
    expect(await response.json()).toMatchObject({ error: { code: 'TURN_PARTS_UNAVAILABLE' } })
    expect(starts).toBe(0)
    const legacy = await handler(request({ protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn-2', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' } }))
    expect(await legacy.text()).not.toContain('turn-parts-v1')
  })
})

describe('parts delivery to the adapter', () => {
  const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
  const fixture = (overrides: { readonly delivery?: 'url' | 'bytes'; readonly multiModal?: boolean; readonly history?: Message[] } = {}) => {
    const seen: Message[][] = []
    let saved: Message[] = overrides.history ?? []
    let signed = 0
    const adapter: AdapterFactory = {
      createSource: input => { seen.push(input.messages); return { async *stream() { yield { type: 'text', content: 'seen' }; yield { type: 'done' } }, abort() {} } },
      ...(overrides.multiModal === undefined ? {} : { capabilities: { multiModal: overrides.multiModal } }),
    }
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'test', chat: { adapter, memory: { load: async () => saved, save: async messages => { saved = [...messages] } } } }),
      sessionStorage: () => ({ load: () => undefined, save: () => true }),
      uploads: { ...policy, store: { ...store, presignGet: async target => `https://storage.invalid/short/${++signed}?ref=${encodeURIComponent(target)}` }, tenantId: () => 'tenant', ...(overrides.delivery ? { delivery: overrides.delivery } : {}) },
    })
    const post = (turnId: string, payload: unknown) => handler(request({ ...event, turnId, payload }))
    return { post, seen, saved: () => saved }
  }
  const text = { type: 'text' as const, text: 'What is in this image?' }
  const partsOf = (messages: Message[] | undefined) => messages?.find(message => message.role === 'user' && message.parts)?.parts

  it('RF-07/RF-11: delivers a short signed URL to the adapter and keeps only the reference in the transcript', async () => {
    const { post, seen, saved } = fixture()
    const response = await post('turn-1', { input: [text, part], capabilities: ['turn-parts-v1'] })
    expect(response.status).toBe(200)
    const stream = await response.text()
    expect(partsOf(seen[0])).toEqual([text, { type: 'image', source: `https://storage.invalid/short/1?ref=${encodeURIComponent(ref)}`, mimeType: 'image/png' }])
    expect(stream).toContain('"capabilities":["turn-parts-v1"]')
    expect(stream).toContain(ref)
    expect(stream).not.toContain('storage.invalid')
    expect(partsOf(saved())).toEqual([text, { type: 'image', source: ref, mimeType: 'image/png' }])
    expect(JSON.stringify(saved())).not.toContain('storage.invalid')
  })
  it('RF-11: delivers bytes as a data URL when the provider cannot fetch URLs, without persisting them', async () => {
    const { post, seen, saved } = fixture({ delivery: 'bytes' })
    const response = await post('turn-1', { input: [part], capabilities: ['turn-parts-v1'] })
    expect(response.status).toBe(200)
    const stream = await response.text()
    const expected = `data:image/png;base64,${btoa('local upload')}`
    expect(partsOf(seen[0])).toEqual([{ type: 'image', source: expected, mimeType: 'image/png' }])
    expect(stream).not.toContain(expected)
    expect(JSON.stringify(saved())).not.toContain('base64')
  })
  it('signs earlier references again on a later text turn and leaves foreign sources untouched', async () => {
    const foreign = { type: 'image' as const, source: 'other/session/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
    const { post, seen } = fixture({ history: [{ id: 'old', role: 'user', content: 'earlier', parts: [foreign], status: 'complete', createdAt: new Date(0) }] })
    await (await post('turn-1', { input: [{ ...part, mimeType: 'image/png' }], capabilities: ['turn-parts-v1'] })).text()
    const followUp = await post('turn-2', { input: 'and now?' }); expect(followUp.status).toBe(200); await followUp.text()
    expect(partsOf(seen[1]?.slice(1))).toEqual([{ type: 'image', source: `https://storage.invalid/short/2?ref=${encodeURIComponent(ref)}`, mimeType: 'image/png' }])
    expect(seen[1]?.[0]?.parts).toEqual([foreign])
  })
  it('maps non-image references to file parts', async () => {
    const pdf = { ...part, mimeType: 'application/pdf' }
    const seen: Message[][] = []
    const adapter: AdapterFactory = { createSource: input => { seen.push(input.messages); return { async *stream() { yield { type: 'done' } }, abort() {} } } }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }),
      uploads: { ...policy, mimeTypes: ['application/pdf'], store: { ...store, read: async () => new Response(bytes, { headers: { 'content-type': 'application/pdf' } }) }, tenantId: () => 'tenant' } })
    const response = await handler(request({ ...event, turnId: 'turn-1', payload: { input: [pdf], capabilities: ['turn-parts-v1'] } }))
    expect(response.status).toBe(200); await response.text()
    expect(partsOf(seen[0])).toEqual([{ type: 'file', source: 'https://storage.invalid/short', mimeType: 'application/pdf' }])
  })
  it('refuses file parts for an adapter that declares no multimodal support, and still accepts text parts', async () => {
    const { post, seen } = fixture({ multiModal: false })
    const refused = await post('turn-1', { input: [text, part], capabilities: ['turn-parts-v1'] })
    expect(refused.status).toBe(422)
    expect(await refused.json()).toMatchObject({ error: { code: 'TURN_PARTS_UNSUPPORTED' } })
    expect(seen).toHaveLength(0)
    const accepted = await post('turn-2', { input: [text], capabilities: ['turn-parts-v1'] }); expect(accepted.status).toBe(200); await accepted.text()
    expect(partsOf(seen[0])).toEqual([text])
  })
  it('fails the turn instead of sending a partial request when a stored reference disappears before delivery', async () => {
    let reads = 0
    const adapterStarts: number[] = []
    const adapter: AdapterFactory = { createSource: () => { adapterStarts.push(1); return { async *stream() { yield { type: 'done' } }, abort() {} } } }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }),
      uploads: { ...policy, delivery: 'bytes', store: { ...store, read: async () => ++reads === 1 ? new Response(bytes, { headers: { 'content-type': 'image/png' } }) : new Response(null, { status: 404 }) }, tenantId: () => 'tenant' } })
    const response = await handler(request({ ...event, turnId: 'turn-1', payload: { input: [part], capabilities: ['turn-parts-v1'] } }))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('CHAT_TURN_FAILED')
    expect(adapterStarts).toHaveLength(0)
  })
})


describe('adapter delivery limits and class contracts', () => {
  it('caps total bytes across historical messages before dispatch', async () => {
    let calls = 0
    const adapter: AdapterFactory = { createSource: () => { calls++; return { async *stream() { yield { type: 'done' } }, abort() {} } } }
    const wrapped = deliverUploadParts(adapter, { ...policy, delivery: 'bytes', maxBytes: bytes.length }, 'tenant', 'session', new AbortController().signal)
    const message: Message = { id: 'm', role: 'user', content: '', status: 'complete', createdAt: new Date(), parts: [{ type: 'image', source: ref }] }
    const source = wrapped.createSource({ messages: [message, { ...message, id: 'm2' }] })
    await expect(async () => { for await (const _chunk of source.stream()) { /* drain */ } }).rejects.toThrow('size limit')
    expect(calls).toBe(0)
  })

  it('preserves class prototype capabilities and private state', async () => {
    class ClassAdapter implements AdapterFactory {
      #calls = 0
      get capabilities() { return { multiModal: false } }
      get calls() { return this.#calls }
      createSourceForSession(input: Parameters<AdapterFactory['createSource']>[0]) { expect(input.messages[0]?.parts?.[0]).toMatchObject({ source: 'https://storage.invalid/short' }); return this.createSource() }
      createSource() { this.#calls++; return { async *stream() { yield { type: 'done' as const } }, abort() {} } }
    }
    const adapter = new ClassAdapter()
    const wrapped = deliverUploadParts(adapter, policy, 'tenant', 'session', new AbortController().signal)
    expect(wrapped.capabilities).toEqual({ multiModal: false })
    for await (const _chunk of wrapped.createSource({ messages: [] }).stream()) { /* drain */ }
    const sessionAdapter = wrapped as AdapterFactory & { createSourceForSession: AdapterFactory['createSource'] }
    const message: Message = { id: 'm', role: 'user', content: '', status: 'complete', createdAt: new Date(), parts: [{ type: 'image', source: ref }] }
    for await (const _chunk of sessionAdapter.createSourceForSession({ messages: [message] }).stream()) { /* drain */ }
    expect(adapter.calls).toBe(2)
  })
})
