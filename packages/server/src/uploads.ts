import { AwsClient } from 'aws4fetch'
import { withTimeout } from '@agentskit/net'
import type { TurnInputPart } from '@agentskit/chat-protocol'
import { readBoundedJson } from './internal.js'

export interface BlobStore {
  readonly presignPut: (ref: string, options: { readonly bytes: number; readonly mimeType: string; readonly expiresIn: number }, signal: AbortSignal) => Promise<{ readonly url: string; readonly headers: Readonly<Record<string, string>> }>
  readonly read: (ref: string, signal: AbortSignal) => Promise<Response>
  readonly presignGet: (ref: string, expiresIn: number, signal: AbortSignal) => Promise<string>
}

export interface UploadPolicy {
  readonly store: BlobStore
  readonly maxBytes: number
  readonly mimeTypes: readonly string[]
  readonly expiresIn?: number
}

export class UploadError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); this.name = 'UploadError' }
}
const fail = (status: number, code: string, message: string): never => { throw new UploadError(status, code, message) }
const id = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const prefix = (tenantId: string, sessionId: string): string => {
  if (!id.test(tenantId) || !id.test(sessionId)) return fail(403, 'UPLOAD_SCOPE_INVALID', 'Upload scope is invalid.')
  return `${tenantId}/${sessionId}/`
}
export const validateUploadPolicy = (policy: UploadPolicy): void => {
  if (!Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 1 || !policy.mimeTypes.length ||
    !Number.isInteger(policy.expiresIn ?? 300) || (policy.expiresIn ?? 300) < 1 || (policy.expiresIn ?? 300) > 600) {
    fail(500, 'UPLOAD_CONFIG_INVALID', 'Upload policy is invalid.')
  }
}
const validateMetadata = (policy: UploadPolicy, bytes: unknown, mimeType: unknown): { bytes: number; mimeType: string } => {
  if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes < 1) return fail(400, 'UPLOAD_INVALID_METADATA', 'Upload size is invalid.')
  if (bytes > policy.maxBytes) fail(413, 'UPLOAD_TOO_LARGE', 'Upload exceeds the size limit.')
  if (typeof mimeType !== 'string' || !policy.mimeTypes.includes(mimeType)) return fail(415, 'UPLOAD_UNSUPPORTED_TYPE', 'Upload type is not allowed.')
  return { bytes, mimeType }
}

/** Host authorization must authenticate the caller and authorize the requested session. */
export const createUploadHandler = (options: UploadPolicy & {
  readonly authorize: (request: Request, sessionId: string, signal: AbortSignal) => Promise<{ readonly tenantId: string }>
  readonly timeoutMs?: number
}): ((request: Request) => Promise<Response>) => {
  validateUploadPolicy(options)
  const timeoutMs = options.timeoutMs ?? 30_000
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) fail(500, 'UPLOAD_CONFIG_INVALID', 'Upload timeout is invalid.')
  return async request => {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)])
    try {
      if (request.method !== 'POST') fail(405, 'REQUEST_METHOD_NOT_ALLOWED', 'Only POST is supported.')
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'REQUEST_UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.')
      const input = await readBoundedJson(request, 64 * 1024, signal, fail)
      if (typeof input !== 'object' || input === null || Array.isArray(input)) return fail(400, 'UPLOAD_INVALID_METADATA', 'Upload metadata is invalid.')
      const body = input as Record<string, unknown>
      if (Object.keys(body).some(key => !['sessionId', 'bytes', 'mimeType'].includes(key)) || typeof body.sessionId !== 'string' || !id.test(body.sessionId)) return fail(400, 'UPLOAD_INVALID_METADATA', 'Upload metadata is invalid.')
      const sessionId = body.sessionId
      const scope = await withTimeout(callbackSignal => options.authorize(request, sessionId, callbackSignal), timeoutMs, signal)
      const metadata = validateMetadata(options, body.bytes, body.mimeType)
      const ref = `${prefix(scope.tenantId, body.sessionId)}${crypto.randomUUID()}`
      const signed = await withTimeout(callbackSignal => options.store.presignPut(ref, { ...metadata, expiresIn: options.expiresIn ?? 300 }, callbackSignal), timeoutMs, signal)
      return Response.json({ ref, ...signed, expiresIn: options.expiresIn ?? 300 }, { status: 201, headers: { 'cache-control': 'no-store' } })
    } catch (error) {
      const safe = error instanceof UploadError ? error : new UploadError(signal.aborted ? 408 : 500, signal.aborted ? 'UPLOAD_TIMEOUT' : 'UPLOAD_FAILED', 'Upload request failed.')
      return Response.json({ error: { version: 1, code: safe.code, message: safe.message, retryable: safe.status >= 500 } }, { status: safe.status, headers: { 'cache-control': 'no-store' } })
    }
  }
}

/** Resolve only tenant/session-bound references, checking the actual stored object before signing a short GET. */
export const resolveUploadParts = async (policy: UploadPolicy, tenantId: string, sessionId: string, parts: readonly TurnInputPart[], signal: AbortSignal): Promise<readonly TurnInputPart[]> => {
  const expectedPrefix = prefix(tenantId, sessionId)
  for (const part of parts) {
    if (part.type === 'text') continue
    if (!part.ref.startsWith(expectedPrefix) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(part.ref.slice(expectedPrefix.length))) fail(403, 'UPLOAD_REFERENCE_FORBIDDEN', 'Upload reference does not belong to this session.')
    validateMetadata(policy, part.bytes, part.mimeType)
    const response = await policy.store.read(part.ref, signal)
    if (!response.ok || !response.body) fail(422, 'UPLOAD_REFERENCE_UNAVAILABLE', 'Upload reference is unavailable.')
    const reader = response.body!.getReader()
    // ponytail: checksum buffers up to maxBytes; use incremental hashing if large-file support is needed.
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      while (true) {
        signal.throwIfAborted()
        const item = await reader.read()
        if (item.done) break
        length += item.value.byteLength
        if (length > part.bytes || length > policy.maxBytes) fail(413, 'UPLOAD_TOO_LARGE', 'Stored upload exceeds the size limit.')
        chunks.push(item.value)
      }
    } finally { await reader.cancel(); reader.releaseLock() }
    if (length !== part.bytes || response.headers.get('content-type')?.split(';')[0] !== part.mimeType) fail(422, 'UPLOAD_METADATA_MISMATCH', 'Stored upload metadata does not match.')
    const data = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2, '0')).join('')
    if (digest !== part.sha256) fail(422, 'UPLOAD_CHECKSUM_MISMATCH', 'Stored upload checksum does not match.')
  }
  return parts
}

/** SigV4 is delegated to aws4fetch; credentials are supplied by the host, never logged. */
export const createS3BlobStore = (options: {
  readonly endpoint: string; readonly bucket: string; readonly region: string
  readonly accessKeyId: string; readonly secretAccessKey: string
}): BlobStore => {
  if ([options.accessKeyId, options.secretAccessKey].some(value => !value || /[\r\n]/.test(value))) fail(500, 'UPLOAD_CONFIG_INVALID', 'Storage credentials are invalid.')
  const endpoint = new URL(options.endpoint)
  if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) fail(500, 'UPLOAD_CONFIG_INVALID', 'Storage endpoint is invalid.')
  const client = new AwsClient({ accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey, service: 's3', region: options.region, retries: 0 })
  const url = (ref: string): URL => new URL(`${endpoint.pathname.replace(/\/$/, '')}/${encodeURIComponent(options.bucket)}/${ref.split('/').map(encodeURIComponent).join('/')}`, endpoint.origin)
  const signed = async (ref: string, method: string, expiresIn: number, signal: AbortSignal, headers?: HeadersInit): Promise<Request> => {
    signal.throwIfAborted()
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 600) fail(500, 'UPLOAD_CONFIG_INVALID', 'Storage URL lifetime is invalid.')
    const target = url(ref); target.searchParams.set('X-Amz-Expires', String(expiresIn))
    return client.sign(target, { method, signal, ...(headers ? { headers } : {}), aws: { signQuery: true, allHeaders: true } })
  }
  return {
    presignPut: async (ref, metadata, signal) => {
      const headers = { 'content-type': metadata.mimeType, 'content-length': String(metadata.bytes) }
      const request = await signed(ref, 'PUT', metadata.expiresIn, signal, headers)
      return { url: request.url, headers }
    },
    read: (ref, signal) => client.fetch(url(ref), { signal }),
    presignGet: async (ref, expiresIn, signal) => (await signed(ref, 'GET', expiresIn, signal)).url,
  }
}
