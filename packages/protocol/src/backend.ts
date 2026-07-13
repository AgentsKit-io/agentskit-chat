import { z } from 'zod'

import { AnswerResponseSchema } from './deterministic.js'

export const ASK_BACKEND_PROTOCOL = 'agentskit.chat.ask' as const
export const ASK_BACKEND_PROTOCOL_VERSION = 1 as const
export const ASK_BACKEND_MAX_MESSAGES = 64
export const ASK_BACKEND_MAX_MESSAGE_CHARS = 16_384
export const ASK_BACKEND_MAX_SOURCES = 8

const SafeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)
const SafeLabelSchema = z.string().trim().min(1).max(256)

const SafeHrefSchema = z.string().min(1).max(2_048).refine(value => {
  if (/[\u0000-\u001F\u007F\\]/u.test(value) || value.startsWith('//')) return false
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return /^\/(?!\/)/.test(value)
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.username === '' && url.password === ''
  } catch {
    return false
  }
}, 'Source must use a safe relative, HTTP, or HTTPS URL.')

export const AskBackendMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(ASK_BACKEND_MAX_MESSAGE_CHARS),
}).strict().readonly()

const DeterministicEscalationSchema = AnswerResponseSchema.refine(
  value => value.outcome === 'escalation',
  'Deterministic context must be an escalation.',
)

/** Additive v1 request accepted by both hosted and self-hosted Ask handlers. */
export const AskBackendRequestSchema = z.object({
  protocol: z.literal(ASK_BACKEND_PROTOCOL).optional(),
  version: z.literal(ASK_BACKEND_PROTOCOL_VERSION).optional(),
  sessionId: SafeIdentifierSchema.optional(),
  messages: z.array(AskBackendMessageSchema).min(1).max(ASK_BACKEND_MAX_MESSAGES).readonly(),
  deterministic: DeterministicEscalationSchema.optional(),
}).strict().readonly()

export const AskBackendSourceSchema = z.object({
  id: SafeIdentifierSchema,
  title: SafeLabelSchema,
  href: SafeHrefSchema,
  excerpt: z.string().trim().min(1).max(4_096),
}).strict().readonly()

export const AskBackendSiteConfigSchema = z.object({
  protocol: z.literal('agentskit.chat.backend-site'),
  version: z.literal(1),
  siteId: SafeIdentifierSchema,
  assistant: z.object({
    id: SafeIdentifierSchema,
    name: SafeLabelSchema,
    suggestions: z.array(SafeLabelSchema).max(8).readonly(),
  }).strict().readonly(),
  corpus: z.object({
    id: SafeIdentifierSchema,
    mode: z.enum(['local', 'federated']),
  }).strict().readonly(),
  components: z.array(SafeIdentifierSchema).max(64).readonly(),
  actions: z.array(SafeIdentifierSchema).max(64).readonly(),
  limits: z.object({
    requestTimeoutMs: z.number().int().min(100).max(120_000),
    retrievalTimeoutMs: z.number().int().min(100).max(60_000),
    generationTimeoutMs: z.number().int().min(100).max(120_000),
    maxSources: z.number().int().min(1).max(ASK_BACKEND_MAX_SOURCES),
  }).strict().readonly(),
  persistence: z.object({ mode: z.enum(['required', 'disabled']) }).strict().readonly(),
}).strict().readonly()

export const AskBackendUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().finite().optional(),
  model: z.string().trim().min(1).max(256).optional(),
}).strict().readonly()

export const AskBackendSessionRecordSchema = z.object({
  revision: z.number().int().nonnegative(),
  messages: z.array(AskBackendMessageSchema).max(ASK_BACKEND_MAX_MESSAGES).readonly(),
}).strict().readonly()

export const AskBackendDiagnosticSchema = z.object({
  code: z.enum([
    'ASK_INVALID_REQUEST', 'ASK_UNAUTHORIZED', 'ASK_FORBIDDEN', 'ASK_RATE_LIMITED',
    'ASK_TIMEOUT', 'ASK_CANCELLED', 'ASK_RETRIEVAL_FAILED', 'ASK_NO_GROUNDED_SOURCES',
    'ASK_GENERATION_FAILED', 'ASK_PERSISTENCE_CONFLICT', 'ASK_INTERNAL',
  ]),
  message: z.string().trim().min(1).max(4_096),
  retryable: z.boolean(),
}).strict().readonly()

export const AskBackendMetricNameSchema = z.enum([
  'request.total_ms', 'stream.first_event_ms', 'stream.first_token_ms', 'stream.bytes', 'stream.events', 'stream.snapshots',
  'deterministic.fallback', 'retrieval.total_ms', 'retrieval.documents', 'persistence.total_ms',
  'cancellation.count', 'conflict.count', 'error.count', 'usage.input_tokens', 'usage.output_tokens',
  'usage.total_tokens', 'cost.usd',
])

export const AskBackendMetricSchema = z.object({
  protocol: z.literal('agentskit.chat.backend-metric'),
  version: z.literal(1),
  name: AskBackendMetricNameSchema,
  siteId: SafeIdentifierSchema,
  corpusId: SafeIdentifierSchema,
  requestId: SafeIdentifierSchema,
  value: z.number().finite().nonnegative(),
  unit: z.enum(['ms', 'bytes', 'count', 'tokens', 'usd']),
  outcome: z.enum(['ok', 'rejected', 'cancelled', 'error']),
  emittedAt: z.string().datetime({ offset: true }),
}).strict().readonly()

export type AskBackendRequest = z.infer<typeof AskBackendRequestSchema>
export type AskBackendMessage = z.infer<typeof AskBackendMessageSchema>
export type AskBackendSource = z.infer<typeof AskBackendSourceSchema>
export type AskBackendSiteConfig = z.infer<typeof AskBackendSiteConfigSchema>
export type AskBackendUsage = z.infer<typeof AskBackendUsageSchema>
export type AskBackendSessionRecord = z.infer<typeof AskBackendSessionRecordSchema>
export type AskBackendDiagnostic = z.infer<typeof AskBackendDiagnosticSchema>
export type AskBackendMetric = z.infer<typeof AskBackendMetricSchema>
