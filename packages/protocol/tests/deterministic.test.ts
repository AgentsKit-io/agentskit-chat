import { describe, expect, it, vi } from 'vitest'

import {
  deterministicAnswerFixtures,
  deterministicSiteConfigFixture,
  invalidDeterministicArtifactFixtures,
  localKnowledgeArtifactFixture,
} from '../src/fixtures.js'
import {
  AnswerResponseSchema,
  computeLocalKnowledgeArtifactContentHash,
  decodeAnswerResponse,
  decodeDeterministicSiteConfig,
  decodeLocalKnowledgeArtifact,
  DETERMINISTIC_ARTIFACT_MAX_BYTES,
  normalizeKnowledgeKey,
  verifyLocalKnowledgeArtifact,
} from '../src/index.js'

describe('deterministic answer protocol v1', () => {
  it('decodes the site config and cryptographically verifies the configured artifact hash', async () => {
    expect(decodeDeterministicSiteConfig(JSON.stringify(deterministicSiteConfigFixture))).toEqual({ ok: true, value: deterministicSiteConfigFixture })
    expect(await computeLocalKnowledgeArtifactContentHash(localKnowledgeArtifactFixture)).toBe(localKnowledgeArtifactFixture.contentHash)
    expect(await verifyLocalKnowledgeArtifact(localKnowledgeArtifactFixture, {
      expectedContentHash: deterministicSiteConfigFixture.artifact.contentHash,
      expectedSiteId: deterministicSiteConfigFixture.siteId,
    })).toEqual({ ok: true, value: localKnowledgeArtifactFixture })
  })

  it('rejects content tampering even when the self-declared and configured hashes still agree', async () => {
    const decoded = await verifyLocalKnowledgeArtifact({
      ...localKnowledgeArtifactFixture,
      entries: localKnowledgeArtifactFixture.entries.map((entry, index) => index === 0
        ? { ...entry, answer: { ...entry.answer, markdown: 'Tampered content.' } }
        : entry),
    }, { expectedContentHash: localKnowledgeArtifactFixture.contentHash, expectedSiteId: localKnowledgeArtifactFixture.siteId })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('DETERMINISTIC_HASH_MISMATCH')
  })

  it('lets producers calculate the first hash without a circular contentHash placeholder', async () => {
    const { contentHash: _contentHash, ...artifactWithoutHash } = localKnowledgeArtifactFixture
    expect(await computeLocalKnowledgeArtifactContentHash(artifactWithoutHash)).toBe(localKnowledgeArtifactFixture.contentHash)
  })

  it('verifies SHA-256 without depending on a Web Crypto global', async () => {
    vi.stubGlobal('crypto', undefined)
    try {
      expect(await verifyLocalKnowledgeArtifact(localKnowledgeArtifactFixture, {
        expectedContentHash: localKnowledgeArtifactFixture.contentHash,
        expectedSiteId: localKnowledgeArtifactFixture.siteId,
      })).toEqual({ ok: true, value: localKnowledgeArtifactFixture })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('requires trusted hash and site anchors at runtime, not only in TypeScript', async () => {
    const decoded = await verifyLocalKnowledgeArtifact(localKnowledgeArtifactFixture, {} as never)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('DETERMINISTIC_INVALID_PAYLOAD')
  })

  it('strips additive v1 fields for forward-compatible producers', () => {
    const decoded = decodeLocalKnowledgeArtifact({
      ...localKnowledgeArtifactFixture,
      future: 'ignored',
      entries: localKnowledgeArtifactFixture.entries.map(entry => ({ ...entry, future: 'ignored' })),
    })
    expect(decoded).toEqual({ ok: true, value: localKnowledgeArtifactFixture })
  })

  it.each(Object.entries(deterministicAnswerFixtures))('accepts the %s response fixture', (_name, response) => {
    expect(decodeAnswerResponse(response)).toEqual({ ok: true, value: response })
  })

  it.each(invalidDeterministicArtifactFixtures)('rejects $name inertly', fixture => {
    const decoded = decodeLocalKnowledgeArtifact(fixture.artifact, 'expectedContentHash' in fixture
      ? { expectedContentHash: fixture.expectedContentHash }
      : {})
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.diagnostic.code).toBe(fixture.code)
      expect(decoded.diagnostic.message).not.toContain('unexpected')
    }
  })

  it('rejects oversized JSON before parsing it', () => {
    const decoded = decodeLocalKnowledgeArtifact(`{"padding":"${'x'.repeat(DETERMINISTIC_ARTIFACT_MAX_BYTES)}"}`)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('DETERMINISTIC_LIMIT_EXCEEDED')
  })

  it('applies the byte limit to programmatic artifacts too', () => {
    const entries = Array.from({ length: 1_024 }, (_, index) => ({
      id: `entry-${index}`, kind: 'restricted-faq' as const, label: 'Large entry', match: { type: 'exact' as const, values: [`question-${index}`] },
      answer: { markdown: 'x'.repeat(1_000), citations: [] },
    }))
    const decoded = decodeLocalKnowledgeArtifact({ ...localKnowledgeArtifactFixture, entries })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('DETERMINISTIC_LIMIT_EXCEEDED')
  })

  it('requires a unique exact alias for every ambiguous entry', () => {
    const entries = localKnowledgeArtifactFixture.entries.slice(1).map(entry => ({
      ...entry,
      match: { type: 'exact' as const, values: ['docs'] },
    }))
    const decoded = decodeLocalKnowledgeArtifact({ ...localKnowledgeArtifactFixture, entries })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('DETERMINISTIC_INVALID_PAYLOAD')
  })

  it('rejects declared aliases whose normalized form exceeds the query limit', () => {
    const decoded = decodeLocalKnowledgeArtifact({
      ...localKnowledgeArtifactFixture,
      entries: [{
        ...localKnowledgeArtifactFixture.entries[0],
        match: { type: 'exact', values: ['\uFDFA'.repeat(100)] },
      }],
    })
    expect(decoded.ok).toBe(false)
  })

  it('rejects cyclic programmatic input without throwing or leaking it', () => {
    const cyclic: Record<string, unknown> = { secret: 'do-not-leak' }
    cyclic.self = cyclic
    expect(decodeLocalKnowledgeArtifact(cyclic)).toEqual({
      ok: false,
      diagnostic: { code: 'DETERMINISTIC_INVALID_PAYLOAD', message: 'Deterministic payload is invalid.', retryable: false },
    })
  })

  it.each(['javascript:alert(1)', '//evil.example/path', '/\\evil.example/path', 'https://user:pass@example.com'])('rejects unsafe links', href => {
    const decoded = decodeDeterministicSiteConfig({
      ...deterministicSiteConfigFixture,
      artifact: { ...deterministicSiteConfigFixture.artifact, href },
    })
    expect(decoded.ok).toBe(false)
  })

  it('uses stable Unicode and whitespace normalization', () => {
    expect(normalizeKnowledgeKey('  ＩＮＳＴＡＬＬ\n CLI  ')).toBe('install cli')
  })

  it('rejects confidence that contradicts the response outcome', () => {
    expect(AnswerResponseSchema.safeParse({
      ...deterministicAnswerFixtures.local,
      confidence: { level: 'low', basis: 'miss' },
    }).success).toBe(false)
  })

  it('rejects a response whose normalized query contradicts its query', () => {
    expect(AnswerResponseSchema.safeParse({
      ...deterministicAnswerFixtures.local,
      normalizedQuery: 'different',
    }).success).toBe(false)
  })
})
