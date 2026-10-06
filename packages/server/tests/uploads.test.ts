import { AwsClient } from 'aws4fetch'
import { describe, expect, it } from 'vitest'
import { createS3BlobStore, createUploadHandler, resolveUploadParts } from '../src/uploads.js'
import type { BlobStore } from '../src/uploads.js'
import { createChatHandler } from '../src/index.js'
import type { AdapterFactory } from '@agentskit/core'

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
  it('preserves string turns and never silently drops parts when upstream capability is unavailable', async () => {
    const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'test', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }), uploads: { ...policy, tenantId: () => 'tenant' } })
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
    const post = (payload: unknown) => handler(request({ ...event, payload }))
    const legacy = await post({ input: 'hello' }); expect(legacy.status).toBe(200); expect(await legacy.text()).not.toContain('turn-parts-v1')
    expect((await post({ input: [part] })).status).toBe(400)
    expect((await post({ input: [part], capabilities: ['turn-parts-v1'] })).status).toBe(501)
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
})

const workerUrl = process.env.CHD_WRANGLER_URL
describe.skipIf(!workerUrl)('real wrangler dev HTTP flow', () => {
  it('presigns and validates uploads through workerd, preserving tenant isolation and the upstream gate', async () => {
    const post = (path: string, body: unknown, tenant = 'tenant') => fetch(`${workerUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-tenant': tenant }, body: JSON.stringify(body) })
    const uploadResponse = await post('/uploads', metadata); expect(uploadResponse.status).toBe(201)
    const result = await uploadResponse.json() as { ref: string; url: string; headers: Record<string, string> }
    expect((await fetch(result.url, { method: 'PUT', headers: result.headers, body: bytes })).status).toBe(200)
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: '2026-10-06T00:00:00.000Z', event: 'client.turn.submit' }
    const realPart = { ...part, ref: result.ref }
    const body = { ...event, payload: { input: [realPart], capabilities: ['turn-parts-v1'] } }
    expect((await post('/chat', body, 'other')).status).toBe(403)
    expect((await post('/chat', { ...body, payload: { ...body.payload, input: [{ ...realPart, sha256: '0'.repeat(64) }] } })).status).toBe(422)
    expect((await post('/chat', body)).status).toBe(501)
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
