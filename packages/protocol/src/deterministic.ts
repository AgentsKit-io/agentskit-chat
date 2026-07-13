import { z } from 'zod'

export const DETERMINISTIC_SITE_PROTOCOL = 'agentskit.chat.site' as const
export const DETERMINISTIC_SITE_PROTOCOL_VERSION = 1 as const
export const DETERMINISTIC_KNOWLEDGE_PROTOCOL = 'agentskit.chat.knowledge' as const
export const DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION = 1 as const
export const ANSWER_PROTOCOL = 'agentskit.chat.answer' as const
export const ANSWER_PROTOCOL_VERSION = 1 as const

export const DETERMINISTIC_ARTIFACT_MAX_BYTES = 524_288
export const DETERMINISTIC_ARTIFACT_MAX_ENTRIES = 1_024
export const DETERMINISTIC_MATCH_MAX_VALUES = 16
export const DETERMINISTIC_QUERY_MAX_CHARS = 512
export const ANSWER_MAX_CITATIONS = 8
export const ANSWER_MAX_SUGGESTIONS = 8

const SafeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)
const ContentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const DateTimeSchema = z.string().datetime({ offset: true })

const isSafeHref = (value: string): boolean => {
  if (value.startsWith('//')) return false
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    return /^\/(?!\/)/.test(value)
  }
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

const SafeHrefSchema = z.string().min(1).max(2_048).refine(isSafeHref, 'Link must be a safe relative, HTTP, or HTTPS URL.')

/** The canonical equality rule used by artifact producers and deterministic clients. */
export const normalizeKnowledgeKey = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')

export const DeterministicSiteConfigSchema = z.object({
  protocol: z.literal(DETERMINISTIC_SITE_PROTOCOL),
  version: z.literal(DETERMINISTIC_SITE_PROTOCOL_VERSION),
  siteId: SafeIdentifierSchema,
  artifact: z.object({
    href: SafeHrefSchema,
    contentHash: ContentHashSchema,
  }).readonly(),
  fallback: z.object({ mode: z.enum(['backend', 'disabled']) }).readonly(),
}).readonly()

export const AnswerCitationSchema = z.object({
  id: SafeIdentifierSchema,
  title: z.string().trim().min(1).max(256),
  href: SafeHrefSchema,
}).readonly()

export const DeterministicKnowledgeEntrySchema = z.object({
  id: SafeIdentifierSchema,
  kind: z.enum(['command', 'package', 'navigation', 'contribution', 'ecosystem', 'restricted-faq', 'document']),
  label: z.string().trim().min(1).max(256),
  match: z.object({
    type: z.literal('exact'),
    values: z.array(z.string().trim().min(1).max(DETERMINISTIC_QUERY_MAX_CHARS))
      .min(1).max(DETERMINISTIC_MATCH_MAX_VALUES)
      .superRefine((values, context) => {
        const seen = new Set<string>()
        values.forEach((value, index) => {
          const normalized = normalizeKnowledgeKey(value)
          if (seen.has(normalized)) context.addIssue({ code: 'custom', path: [index], message: 'Match values must be unique after normalization.' })
          seen.add(normalized)
        })
      }).readonly(),
  }).readonly(),
  answer: z.object({
    markdown: z.string().trim().min(1).max(16_384),
    citations: z.array(AnswerCitationSchema).max(ANSWER_MAX_CITATIONS).readonly(),
  }).readonly(),
}).readonly()

export const LocalKnowledgeArtifactSchema = z.object({
  protocol: z.literal(DETERMINISTIC_KNOWLEDGE_PROTOCOL),
  version: z.literal(DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION),
  artifactId: SafeIdentifierSchema,
  siteId: SafeIdentifierSchema,
  contentHash: ContentHashSchema,
  generatedAt: DateTimeSchema,
  expiresAt: DateTimeSchema.optional(),
  entries: z.array(DeterministicKnowledgeEntrySchema).max(DETERMINISTIC_ARTIFACT_MAX_ENTRIES).readonly(),
}).superRefine((artifact, context) => {
  const ids = new Set<string>()
  artifact.entries.forEach((entry, index) => {
    if (ids.has(entry.id)) context.addIssue({ code: 'custom', path: ['entries', index, 'id'], message: 'Entry ids must be unique.' })
    ids.add(entry.id)
  })
  if (artifact.expiresAt !== undefined && Date.parse(artifact.expiresAt) <= Date.parse(artifact.generatedAt)) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiration must be after generation.' })
  }
}).readonly()

export const AnswerConfidenceSchema = z.object({
  level: z.enum(['high', 'medium', 'low']),
  basis: z.enum(['exact', 'ambiguous', 'miss', 'stale', 'corrupt', 'offline', 'backend']),
}).readonly()

const LocalProvenanceSchema = z.object({
  source: z.literal('local'),
  artifactId: SafeIdentifierSchema,
  contentHash: ContentHashSchema,
  entryIds: z.array(SafeIdentifierSchema).min(1).max(ANSWER_MAX_SUGGESTIONS).readonly(),
}).readonly()

const BackendProvenanceSchema = z.object({
  source: z.literal('backend'),
  provider: z.string().trim().min(1).max(128).optional(),
  model: z.string().trim().min(1).max(128).optional(),
}).readonly()

export const AnswerSuggestionSchema = z.object({
  id: SafeIdentifierSchema,
  label: z.string().trim().min(1).max(256),
  value: z.string().trim().min(1).max(DETERMINISTIC_QUERY_MAX_CHARS),
}).readonly()

const AnswerQuerySchema = z.string().max(DETERMINISTIC_QUERY_MAX_CHARS)

export const AnswerResponseSchema = z.discriminatedUnion('outcome', [
  z.object({
    protocol: z.literal(ANSWER_PROTOCOL), version: z.literal(ANSWER_PROTOCOL_VERSION), outcome: z.literal('answer'),
    query: AnswerQuerySchema, normalizedQuery: AnswerQuerySchema,
    answer: z.object({ markdown: z.string().min(1).max(16_384), citations: z.array(AnswerCitationSchema).max(ANSWER_MAX_CITATIONS).readonly() }).readonly(),
    provenance: z.union([LocalProvenanceSchema, BackendProvenanceSchema]),
    confidence: AnswerConfidenceSchema,
  }).readonly(),
  z.object({
    protocol: z.literal(ANSWER_PROTOCOL), version: z.literal(ANSWER_PROTOCOL_VERSION), outcome: z.literal('choices'),
    query: AnswerQuerySchema, normalizedQuery: AnswerQuerySchema,
    message: z.string().min(1).max(4_096), suggestions: z.array(AnswerSuggestionSchema).min(2).max(ANSWER_MAX_SUGGESTIONS).readonly(),
    provenance: LocalProvenanceSchema,
    confidence: AnswerConfidenceSchema,
  }).readonly(),
  z.object({
    protocol: z.literal(ANSWER_PROTOCOL), version: z.literal(ANSWER_PROTOCOL_VERSION), outcome: z.literal('escalation'),
    query: AnswerQuerySchema, normalizedQuery: AnswerQuerySchema,
    message: z.string().min(1).max(4_096), reason: z.enum(['miss', 'stale', 'corrupt', 'offline']),
    candidateEntryIds: z.array(SafeIdentifierSchema).max(ANSWER_MAX_SUGGESTIONS).readonly().optional(),
    confidence: AnswerConfidenceSchema,
  }).readonly(),
]).superRefine((response, context) => {
  if (response.outcome === 'answer') {
    const validLocal = response.provenance.source === 'local'
      && response.confidence.level === 'high' && response.confidence.basis === 'exact'
      && response.provenance.entryIds.length === 1
    const validBackend = response.provenance.source === 'backend'
      && response.confidence.level === 'high' && response.confidence.basis === 'backend'
    if (!validLocal && !validBackend) context.addIssue({ code: 'custom', path: ['confidence'], message: 'Answer confidence must match its provenance.' })
  } else if (response.outcome === 'choices') {
    if (response.confidence.level !== 'medium' || response.confidence.basis !== 'ambiguous') {
      context.addIssue({ code: 'custom', path: ['confidence'], message: 'Choices require medium ambiguous confidence.' })
    }
    const suggestionIds = response.suggestions.map(suggestion => suggestion.id)
    if (suggestionIds.length !== response.provenance.entryIds.length
      || suggestionIds.some((id, index) => id !== response.provenance.entryIds[index])) {
      context.addIssue({ code: 'custom', path: ['provenance', 'entryIds'], message: 'Choice provenance must match suggestions in order.' })
    }
  } else if (response.confidence.level !== 'low' || response.confidence.basis !== response.reason) {
    context.addIssue({ code: 'custom', path: ['confidence'], message: 'Escalation confidence must match its reason.' })
  }
})

export type DeterministicSiteConfig = z.infer<typeof DeterministicSiteConfigSchema>
export type DeterministicKnowledgeEntry = z.infer<typeof DeterministicKnowledgeEntrySchema>
export type LocalKnowledgeArtifact = z.infer<typeof LocalKnowledgeArtifactSchema>
export type AnswerCitation = z.infer<typeof AnswerCitationSchema>
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>

export type DeterministicDecodeCode =
  | 'DETERMINISTIC_INVALID_PAYLOAD'
  | 'DETERMINISTIC_UNSUPPORTED_VERSION'
  | 'DETERMINISTIC_LIMIT_EXCEEDED'
  | 'DETERMINISTIC_HASH_MISMATCH'

export type DeterministicDecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostic: { readonly code: DeterministicDecodeCode; readonly message: string; readonly retryable: false } }

const failure = <T>(code: DeterministicDecodeCode, message: string): DeterministicDecodeResult<T> => ({
  ok: false, diagnostic: { code, message, retryable: false },
})

const parseBoundedInput = <T>(input: unknown, schema: z.ZodType<T>, protocol: string, version: number, maxBytes?: number): DeterministicDecodeResult<T> => {
  let candidate = input
  if (typeof input === 'string') {
    if (maxBytes !== undefined && new TextEncoder().encode(input).byteLength > maxBytes) {
      return failure('DETERMINISTIC_LIMIT_EXCEEDED', 'Deterministic payload exceeds its safety limit.')
    }
    try { candidate = JSON.parse(input) as unknown } catch {
      return failure('DETERMINISTIC_INVALID_PAYLOAD', 'Deterministic payload is not valid JSON.')
    }
  }
  try {
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
      const record = candidate as Record<string, unknown>
      if (record.protocol === protocol && typeof record.version === 'number' && record.version !== version) {
        return failure('DETERMINISTIC_UNSUPPORTED_VERSION', 'Deterministic payload uses an unsupported version.')
      }
    }
    const parsed = schema.safeParse(candidate)
    if (!parsed.success) return failure('DETERMINISTIC_INVALID_PAYLOAD', 'Deterministic payload is invalid.')
    if (maxBytes !== undefined && typeof input !== 'string'
      && new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > maxBytes) {
      return failure('DETERMINISTIC_LIMIT_EXCEEDED', 'Deterministic payload exceeds its safety limit.')
    }
    return { ok: true, value: parsed.data }
  } catch {
    return failure('DETERMINISTIC_INVALID_PAYLOAD', 'Deterministic payload is invalid.')
  }
}

export const decodeDeterministicSiteConfig = (input: unknown): DeterministicDecodeResult<DeterministicSiteConfig> =>
  parseBoundedInput(input, DeterministicSiteConfigSchema, DETERMINISTIC_SITE_PROTOCOL, DETERMINISTIC_SITE_PROTOCOL_VERSION, 16_384)

export interface DecodeLocalKnowledgeArtifactOptions { readonly expectedContentHash?: string }

export const decodeLocalKnowledgeArtifact = (input: unknown, options: DecodeLocalKnowledgeArtifactOptions = {}): DeterministicDecodeResult<LocalKnowledgeArtifact> => {
  const decoded = parseBoundedInput(input, LocalKnowledgeArtifactSchema, DETERMINISTIC_KNOWLEDGE_PROTOCOL, DETERMINISTIC_KNOWLEDGE_PROTOCOL_VERSION, DETERMINISTIC_ARTIFACT_MAX_BYTES)
  if (!decoded.ok) return decoded
  if (options.expectedContentHash !== undefined && decoded.value.contentHash !== options.expectedContentHash) {
    return failure('DETERMINISTIC_HASH_MISMATCH', 'Deterministic artifact does not match the configured content hash.')
  }
  return decoded
}

export const decodeAnswerResponse = (input: unknown): DeterministicDecodeResult<AnswerResponse> =>
  parseBoundedInput(input, AnswerResponseSchema, ANSWER_PROTOCOL, ANSWER_PROTOCOL_VERSION, 262_144)
