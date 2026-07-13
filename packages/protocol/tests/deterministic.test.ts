import { describe, expect, it } from 'vitest'

import {
  deterministicAnswerFixtures,
  deterministicSiteConfigFixture,
  invalidDeterministicArtifactFixtures,
  localKnowledgeArtifactFixture,
} from '../src/fixtures.js'
import {
  AnswerResponseSchema,
  decodeAnswerResponse,
  decodeDeterministicSiteConfig,
  decodeLocalKnowledgeArtifact,
  DETERMINISTIC_ARTIFACT_MAX_BYTES,
  normalizeKnowledgeKey,
} from '../src/index.js'

describe('deterministic answer protocol v1', () => {
  it('decodes the site config and verifies the configured artifact hash', () => {
    expect(decodeDeterministicSiteConfig(JSON.stringify(deterministicSiteConfigFixture))).toEqual({ ok: true, value: deterministicSiteConfigFixture })
    expect(decodeLocalKnowledgeArtifact(localKnowledgeArtifactFixture, {
      expectedContentHash: deterministicSiteConfigFixture.artifact.contentHash,
    })).toEqual({ ok: true, value: localKnowledgeArtifactFixture })
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

  it('rejects cyclic programmatic input without throwing or leaking it', () => {
    const cyclic: Record<string, unknown> = { secret: 'do-not-leak' }
    cyclic.self = cyclic
    expect(decodeLocalKnowledgeArtifact(cyclic)).toEqual({
      ok: false,
      diagnostic: { code: 'DETERMINISTIC_INVALID_PAYLOAD', message: 'Deterministic payload is invalid.', retryable: false },
    })
  })

  it.each(['javascript:alert(1)', '//evil.example/path', 'https://user:pass@example.com'])('rejects unsafe links', href => {
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
})
