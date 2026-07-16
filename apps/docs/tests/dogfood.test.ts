import { decodeAskEvents, verifyLocalKnowledgeArtifactSync } from '@agentskit/chat/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createDocsAskHandler, unavailableAskResponse } from '../lib/ask-handler'
import { collectCanonicalDocs, publicDocSlug } from '../lib/docs-index'
import { KNOWLEDGE_HASH, localKnowledgeArtifact, verifiedKnowledgeArtifact } from '../lib/knowledge'

const askRequest = (query: string) => new Request('https://chat.agentskit.io/api/ask?corpus=agentskit-chat-public&persona=agentskit-chat-guide', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ protocol: 'agentskit.chat.ask', version: 1, messages: [{ role: 'user', content: query }] }),
})

describe('documentation dogfood', () => {
  it('publishes a bounded, self-verifying public knowledge artifact', () => {
    expect(verifiedKnowledgeArtifact).not.toBeNull()
    expect(verifyLocalKnowledgeArtifactSync(localKnowledgeArtifact, {
      expectedContentHash: KNOWLEDGE_HASH,
      expectedSiteId: 'agentskit-chat-docs',
    })).toEqual(expect.objectContaining({ ok: true }))
  })

  it('rejects a corrupted deterministic artifact', () => {
    expect(verifyLocalKnowledgeArtifactSync({ ...localKnowledgeArtifact, artifactId: 'tampered' }, {
      expectedContentHash: KNOWLEDGE_HASH,
      expectedSiteId: 'agentskit-chat-docs',
    })).toEqual(expect.objectContaining({ ok: false, diagnostic: expect.objectContaining({ code: 'DETERMINISTIC_HASH_MISMATCH' }) }))
  })

  it('indexes the canonical repository corpus without an app-local prose copy', async () => {
    const documents = await collectCanonicalDocs()
    expect(documents.length).toBeGreaterThan(50)
    expect(documents.some(document => document.path === 'index.mdx' && document.title === 'AgentsKit Chat' && document.description.startsWith('Build one versioned'))).toBe(true)
    expect(documents.some(document => document.path === 'backend.md' && document.title === 'Hosted and self-hosted Ask backend')).toBe(true)
  })

  it('maps canonical index documents to public folder URLs', () => {
    expect(publicDocSlug('index.mdx')).toBe('')
    expect(publicDocSlug('getting-started/README.md')).toBe('getting-started')
    expect(publicDocSlug('for-agents/index.md')).toBe('for-agents')
    expect(publicDocSlug('backend.md')).toBe('backend')
  })

  it('runs the public Ask handler with injected grounded adapters and citations', async () => {
    const retrieve = vi.fn(() => [{ id: 'backend', title: 'Backend integration', href: '/docs/backend', excerpt: 'Hosts inject AgentsKit retrieval and generation.' }])
    const handler = createDocsAskHandler({
      retriever: { retrieve },
      generator: { async *generate({ sources }) { yield { type: 'text', delta: `Grounded in ${sources[0]?.title}.` } } },
      authenticate: () => ({ ok: true, context: { subjectId: 'docs-test-user' } }),
      resolveSubjectId: context => context.subjectId,
      resolveSite: () => ({
        protocol: 'agentskit.chat.backend-site', version: 1, siteId: 'agentskit-chat-docs',
        assistant: { id: 'agentskit-chat-guide', name: 'AgentsKit Chat guide', suggestions: ['Which clients are supported?'] },
        corpus: { id: 'agentskit-chat-public', mode: 'local' }, components: ['source-list'], actions: [],
        limits: { requestTimeoutMs: 30_000, retrievalTimeoutMs: 8_000, generationTimeoutMs: 20_000, maxSources: 5 },
        persistence: { mode: 'disabled' },
      }),
      rateLimit: () => ({ allowed: true }),
    })
    const response = await handler(askRequest('How are hosted and self-hosted backends equivalent?'))
    const events = decodeAskEvents(await response.text()).events
    expect(response.status).toBe(200)
    expect(retrieve).toHaveBeenCalledOnce()
    expect(events).toEqual(expect.arrayContaining([
      { type: 'text', delta: 'Grounded in Backend integration.' },
      expect.objectContaining({ type: 'tool', name: 'cite' }),
      expect.objectContaining({ type: 'done' }),
    ]))
  })

  it('fails closed when a deployment has no grounded adapters', async () => {
    const response = unavailableAskResponse()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: {
      code: 'ASK_INTERNAL',
      message: 'The grounded Ask backend is not configured for this deployment.',
      retryable: false,
    } })
  })
})
