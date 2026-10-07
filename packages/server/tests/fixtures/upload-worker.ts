import { createChatHandler } from '../../src/index.js'
import { createS3BlobStore, createUploadHandler, UploadError } from '../../src/uploads.js'
import type { AdapterFactory } from '@agentskit/core'

// Local contract fixture only. No production credentials or authentication policy.
export const uploadWorker = {
  async fetch(request: Request, env: { S3_ENDPOINT: string }): Promise<Response> {
    const store = createS3BlobStore({ endpoint: env.S3_ENDPOINT, bucket: 'chd-contract', region: 'us-east-1', accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' })
    const policy = { store, maxBytes: 1024, mimeTypes: ['image/png'] }
    const tenantId = request.headers.get('x-test-tenant')
    if (!tenantId) return Response.json({ error: 'Authentication required' }, { status: 401 })
    const uploads = createUploadHandler({ ...policy, authorize: async (_request, sessionId) => {
      if (sessionId !== 'session') throw new UploadError(403, 'SESSION_FORBIDDEN', 'Session is forbidden.')
      return { tenantId }
    } })
    // cross-platform-ignore: HTTP route pathname, never a filesystem path.
    if (new URL(request.url).pathname === '/uploads') return uploads(request)
    const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }
    return createChatHandler({ uploads: { ...policy, tenantId: () => tenantId }, resolveDefinition: () => ({ id: 'fixture', chat: { adapter } }), sessionStorage: () => ({ load: () => undefined, save: () => true }) })(request)
  },
}
