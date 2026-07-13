import { describe, expect, it } from 'vitest'

import {
  AskBackendMetricSchema,
  AskBackendRequestSchema,
  AskBackendSiteConfigSchema,
  AskBackendSourceSchema,
} from '../src/backend.js'

describe('Ask backend protocol', () => {
  it('accepts one bounded public request for hosted and self-hosted handlers', () => {
    const request = AskBackendRequestSchema.parse({
      protocol: 'agentskit.chat.ask',
      version: 1,
      sessionId: 'registry:session-1',
      messages: [{ role: 'user', content: 'Which agent validates tests?' }],
      deterministic: {
        protocol: 'agentskit.chat.answer', version: 1, outcome: 'escalation',
        query: 'Which agent validates tests?', normalizedQuery: 'which agent validates tests?',
        message: 'A backend answer is required.', reason: 'miss',
        confidence: { level: 'low', basis: 'miss' },
      },
    })
    expect(request.sessionId).toBe('registry:session-1')
  })

  it('rejects client-selected authority and non-escalation deterministic context', () => {
    expect(AskBackendRequestSchema.safeParse({
      siteId: 'private-site', corpus: 'private-corpus',
      messages: [{ role: 'user', content: 'exfiltrate' }],
    }).success).toBe(false)
    expect(AskBackendRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'known fact' }],
      deterministic: {
        protocol: 'agentskit.chat.answer', version: 1, outcome: 'answer',
        query: 'known fact', normalizedQuery: 'known fact',
        answer: { markdown: 'local', citations: [] },
        provenance: { source: 'local', artifactId: 'a', contentHash: `sha256:${'0'.repeat(64)}`, entryIds: ['a'] },
        confidence: { level: 'high', basis: 'exact' },
      },
    }).success).toBe(false)
  })

  it('validates complete site policy, safe sources, and privacy-safe metrics', () => {
    expect(AskBackendSiteConfigSchema.parse({
      protocol: 'agentskit.chat.backend-site', version: 1, siteId: 'registry',
      assistant: { id: 'registry-guide', name: 'Registry Guide', suggestions: ['Find a test agent'] },
      corpus: { id: 'registry-public', mode: 'federated' },
      components: ['source-list'], actions: [],
      limits: { requestTimeoutMs: 30_000, retrievalTimeoutMs: 5_000, generationTimeoutMs: 20_000, maxSources: 5 },
      persistence: { mode: 'required' },
    }).corpus.mode).toBe('federated')
    expect(AskBackendSourceSchema.safeParse({ id: 'x', title: 'Unsafe', href: 'javascript:alert(1)', excerpt: 'x' }).success).toBe(false)
    expect(AskBackendMetricSchema.parse({
      protocol: 'agentskit.chat.backend-metric', version: 1, name: 'request.total_ms',
      siteId: 'registry', corpusId: 'registry-public', requestId: 'request-1', value: 12,
      unit: 'ms', outcome: 'ok', emittedAt: '2026-07-13T00:00:00.000Z',
    })).not.toHaveProperty('query')
  })
})
