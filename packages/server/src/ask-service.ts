import {
  AskBackendDiagnosticSchema,
  AskBackendMetricSchema,
  AskBackendRequestSchema,
  AskBackendSessionRecordSchema,
  AskBackendSiteConfigSchema,
  AskBackendSourceSchema,
  AskBackendUsageSchema,
  AskEventSchema,
  type AskBackendDiagnostic,
  type AskBackendMessage,
  type AskBackendMetric,
  type AskBackendSiteConfig,
  type AskBackendSessionRecord,
  type AskBackendSource,
  type AskBackendUsage,
  type AskEvent,
} from '@agentskit/chat-protocol'

import { readBoundedJson, withAbort } from './internal.js'

export type AskServiceHandler = (request: Request) => Promise<Response>
export type AskServiceAuthenticationResult<TContext> =
  | { readonly ok: true; readonly context: TContext }
  | { readonly ok: false; readonly response: Response }

export interface AskServiceRetrieverInput {
  readonly query: string
  readonly messages: readonly AskBackendMessage[]
  readonly site: AskBackendSiteConfig
  readonly signal: AbortSignal
}

/** Implement with an upstream AgentsKit RAG or Retriever adapter. */
export interface AskServiceRetriever {
  readonly retrieve: (input: AskServiceRetrieverInput) => readonly AskBackendSource[] | Promise<readonly AskBackendSource[]>
}

export type AskServiceGenerationChunk =
  | { readonly type: 'text'; readonly delta: string }
  | { readonly type: 'usage'; readonly usage: AskBackendUsage }

export interface AskServiceGeneratorInput extends AskServiceRetrieverInput {
  readonly sources: readonly AskBackendSource[]
}

/** Implement with an AgentsKit provider/adapter; the server owns only bounded projection. */
export interface AskServiceGenerator {
  readonly generate: (input: AskServiceGeneratorInput) => AsyncIterable<AskServiceGenerationChunk>
}

export type AskServiceSessionRecord = AskBackendSessionRecord

export interface AskServiceSessionStore {
  readonly load: (key: { readonly siteId: string; readonly subjectId: string; readonly sessionId: string }, signal: AbortSignal) => AskServiceSessionRecord | undefined | Promise<AskServiceSessionRecord | undefined>
  readonly save: (key: { readonly siteId: string; readonly subjectId: string; readonly sessionId: string }, record: AskServiceSessionRecord, expectedRevision: number, signal: AbortSignal) => boolean | Promise<boolean>
}

export interface AskServiceRateLimitDecision {
  readonly allowed: boolean
  readonly retryAfterSeconds?: number
}

export interface AskServiceHandlerOptions<TContext> {
  readonly authenticate: (request: Request, signal: AbortSignal) => AskServiceAuthenticationResult<TContext> | Promise<AskServiceAuthenticationResult<TContext>>
  readonly resolveSite: (context: TContext, signal: AbortSignal) => AskBackendSiteConfig | Promise<AskBackendSiteConfig>
  readonly resolveSubjectId: (context: TContext) => string
  readonly retrievers: { readonly local?: AskServiceRetriever; readonly federated?: AskServiceRetriever }
  readonly generator: AskServiceGenerator
  readonly sessionStore?: AskServiceSessionStore
  readonly rateLimit?: (input: { readonly context: TContext; readonly site: AskBackendSiteConfig; readonly subjectId: string; readonly signal: AbortSignal }) => AskServiceRateLimitDecision | Promise<AskServiceRateLimitDecision>
  readonly onMetric?: (metric: AskBackendMetric) => void | Promise<void>
  readonly maxBodyBytes?: number
  readonly bootstrapTimeoutMs?: number
  readonly createId?: () => string
  readonly now?: () => Date
  readonly clock?: () => number
}

class AskServiceError extends Error {
  readonly status: number
  readonly diagnostic: AskBackendDiagnostic
  readonly retryAfterSeconds: number | undefined
  constructor(status: number, diagnostic: AskBackendDiagnostic, retryAfterSeconds?: number) {
    super(diagnostic.message)
    this.name = 'AskServiceError'
    this.status = status
    this.diagnostic = diagnostic
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const encoder = new TextEncoder()
const fail = (status: number, code: AskBackendDiagnostic['code'], message: string, retryable = false, retryAfterSeconds?: number): never => {
  throw new AskServiceError(status, AskBackendDiagnosticSchema.parse({ code, message, retryable }), retryAfterSeconds)
}
const safeFailure = (error: unknown): AskServiceError => error instanceof AskServiceError
  ? error
  : new AskServiceError(500, { code: 'ASK_INTERNAL', message: 'The Ask request failed.', retryable: true })
const errorResponse = (error: AskServiceError, requestId: string): Response => new Response(JSON.stringify({ error: error.diagnostic }), {
  status: error.status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-request-id': requestId,
    ...(error.retryAfterSeconds === undefined ? {} : { 'retry-after': String(error.retryAfterSeconds) }),
  },
})

const stableSubject = (value: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/.test(value)) fail(500, 'ASK_INTERNAL', 'The Ask host identity is invalid.')
  return value
}

const latestQuestion = (messages: readonly AskBackendMessage[]): string => {
  const question = [...messages].reverse().find(message => message.role === 'user')?.content.trim()
  return question === undefined || question === ''
    ? fail(400, 'ASK_INVALID_REQUEST', 'A user question is required.')
    : question
}

const mergeSessionMessages = (stored: readonly AskBackendMessage[], submitted: readonly AskBackendMessage[]): readonly AskBackendMessage[] => {
  const question = [...submitted].reverse().find(message => message.role === 'user')
  if (question === undefined) return stored
  const last = stored.at(-1)
  return last?.role === 'user' && last.content === question.content ? stored : [...stored, question].slice(-64)
}

export const createAskServiceHandler = <TContext>(options: AskServiceHandlerOptions<TContext>): AskServiceHandler => {
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024
  const bootstrapTimeoutMs = options.bootstrapTimeoutMs ?? 30_000
  if (![maxBodyBytes, bootstrapTimeoutMs].every(value => Number.isSafeInteger(value) && value > 0)) {
    fail(500, 'ASK_INTERNAL', 'The Ask handler configuration is invalid.')
  }
  const createId = options.createId ?? (() => crypto.randomUUID())
  const now = options.now ?? (() => new Date())
  const clock = options.clock ?? Date.now

  return async request => {
    let candidateRequestId: string
    try { candidateRequestId = createId() } catch { candidateRequestId = crypto.randomUUID() }
    const requestId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(candidateRequestId)
      ? candidateRequestId
      : crypto.randomUUID()
    const startedAt = clock()
    const bootstrap = AbortSignal.timeout(bootstrapTimeoutMs)
    const bootstrapSignal = AbortSignal.any([request.signal, bootstrap])
    let site: AskBackendSiteConfig | undefined
    let workDeadline: AbortSignal | undefined
    let emittedErrorMetric = false
    const metric = (name: AskBackendMetric['name'], value: number, unit: AskBackendMetric['unit'], outcome: AskBackendMetric['outcome']): void => {
      if (site === undefined) return
      const record = AskBackendMetricSchema.parse({
        protocol: 'agentskit.chat.backend-metric', version: 1, name,
        siteId: site.siteId, corpusId: site.corpus.id, requestId,
        value: Math.max(0, value), unit, outcome, emittedAt: now().toISOString(),
      })
      try { void Promise.resolve(options.onMetric?.(record)).catch(() => undefined) } catch { /* observer isolation */ }
    }
    const recordError = (outcome: 'rejected' | 'cancelled' | 'error'): void => {
      if (emittedErrorMetric) return
      emittedErrorMetric = true
      metric(outcome === 'cancelled' ? 'cancellation.count' : 'error.count', 1, 'count', outcome)
      metric('request.total_ms', clock() - startedAt, 'ms', outcome)
    }

    try {
      if (request.method !== 'POST') fail(405, 'ASK_INVALID_REQUEST', 'Only POST is supported.')
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        fail(415, 'ASK_INVALID_REQUEST', 'Content-Type must be application/json.')
      }
      const authenticated = await withAbort(options.authenticate(request, bootstrapSignal), bootstrapSignal)
      if (!authenticated.ok) return authenticated.response
      site = AskBackendSiteConfigSchema.parse(await withAbort(options.resolveSite(authenticated.context, bootstrapSignal), bootstrapSignal))
      const subjectId = stableSubject(options.resolveSubjectId(authenticated.context))
      const url = new URL(request.url)
      const corpusHint = url.searchParams.get('corpus')
      const personaHint = url.searchParams.get('persona')
      if ((corpusHint !== null && corpusHint !== site.corpus.id) || (personaHint !== null && personaHint !== site.assistant.id)) {
        fail(403, 'ASK_FORBIDDEN', 'The requested assistant or corpus is not authorized for this site.')
      }
      const requestDeadline = AbortSignal.timeout(site.limits.requestTimeoutMs)
      workDeadline = requestDeadline
      const responseAbort = new AbortController()
      const signal = AbortSignal.any([request.signal, requestDeadline, responseAbort.signal])
      const limited: AskServiceRateLimitDecision = await withAbort(
        options.rateLimit?.({ context: authenticated.context, site, subjectId, signal }) ?? { allowed: true },
        signal,
      )
      if (!limited.allowed) fail(429, 'ASK_RATE_LIMITED', 'The Ask rate limit was exceeded.', true, limited.retryAfterSeconds)

      const raw = await readBoundedJson(request, maxBodyBytes, signal, (status, _code, message) =>
        fail(status, 'ASK_INVALID_REQUEST', message))
      const parsed = AskBackendRequestSchema.safeParse(raw)
      const input = parsed.success && parsed.data !== undefined
        ? parsed.data
        : fail(400, 'ASK_INVALID_REQUEST', 'The Ask request payload is invalid.')
      metric('deterministic.fallback', input.deterministic === undefined ? 0 : 1, 'count', 'ok')
      if (site.persistence.mode === 'required' && (input.sessionId === undefined || options.sessionStore === undefined)) {
        fail(500, 'ASK_INTERNAL', 'Required Ask persistence is not configured.')
      }

      const key = input.sessionId === undefined ? undefined : { siteId: site.siteId, subjectId, sessionId: input.sessionId }
      let stored: AskServiceSessionRecord | undefined
      if (key !== undefined && options.sessionStore !== undefined) {
        const persistenceStarted = clock()
        const loaded = await withAbort(options.sessionStore.load(key, signal), signal)
        stored = loaded === undefined
          ? undefined
          : AskBackendSessionRecordSchema.parse(loaded)
        metric('persistence.total_ms', clock() - persistenceStarted, 'ms', 'ok')
      }
      const messages = stored === undefined ? input.messages : mergeSessionMessages(stored.messages, input.messages)
      const query = latestQuestion(messages)
      const retriever = options.retrievers[site.corpus.mode]
        ?? fail(500, 'ASK_INTERNAL', 'The configured Ask retriever is unavailable.')
      const retrievalStarted = clock()
      const retrievalSignal = AbortSignal.any([signal, AbortSignal.timeout(site.limits.retrievalTimeoutMs)])
      const sources: readonly AskBackendSource[] = await (async () => {
        try {
          const candidates = await withAbort(retriever.retrieve({ query, messages, site, signal: retrievalSignal }), retrievalSignal)
          return candidates.flatMap(candidate => {
            const decoded = AskBackendSourceSchema.safeParse(candidate)
            return decoded.success ? [decoded.data] : []
          }).slice(0, site.limits.maxSources)
        } catch (error) {
          if (signal.aborted) throw error
          if (retrievalSignal.aborted) fail(408, 'ASK_TIMEOUT', 'Grounded retrieval timed out.', true)
          return fail(502, 'ASK_RETRIEVAL_FAILED', 'Grounded retrieval is temporarily unavailable.', true)
        }
      })()
      metric('retrieval.total_ms', clock() - retrievalStarted, 'ms', 'ok')
      metric('retrieval.documents', sources.length, 'count', 'ok')
      if (sources.length === 0) fail(422, 'ASK_NO_GROUNDED_SOURCES', 'No grounded sources were found for this question.')

      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          let bytes = 0
          let events = 0
          let firstEvent = false
          let firstToken = false
          let answer = ''
          let usage: AskBackendUsage | undefined
          const generationDeadline = AbortSignal.timeout(site!.limits.generationTimeoutMs)
          const generationSignal = AbortSignal.any([signal, generationDeadline])
          const emit = (candidate: AskEvent): void => {
            const event = AskEventSchema.parse(candidate)
            const chunk = encoder.encode(`${JSON.stringify(event)}\n`)
            if (!firstEvent) { firstEvent = true; metric('stream.first_event_ms', clock() - startedAt, 'ms', 'ok') }
            if (event.type === 'text' && !firstToken) { firstToken = true; metric('stream.first_token_ms', clock() - startedAt, 'ms', 'ok') }
            bytes += chunk.byteLength
            events += 1
            controller.enqueue(chunk)
          }
          try {
            const generation = options.generator.generate({ query, messages, site: site!, sources, signal: generationSignal })
            for await (const chunk of generation) {
              if (generationSignal.aborted) throw generationSignal.reason
              if (chunk.type === 'usage') {
                usage = AskBackendUsageSchema.parse(chunk.usage)
                continue
              }
              if (chunk.delta === '') continue
              answer += chunk.delta
              if (answer.length > 16_384) fail(502, 'ASK_GENERATION_FAILED', 'The grounded answer exceeded its safe limit.', true)
              emit({ type: 'text', delta: chunk.delta })
            }
            if (answer.trim() === '') fail(502, 'ASK_GENERATION_FAILED', 'The grounded answer was empty.', true)
            emit({
              type: 'tool', id: `sources-${requestId}`, name: 'cite',
              args: { sources: sources.map(source => ({ id: source.id, title: source.title, path: source.href })) },
            })
            if (key !== undefined && options.sessionStore !== undefined) {
              const persistenceStarted = clock()
              const revision = (stored?.revision ?? 0) + 1
              const saved = await withAbort(options.sessionStore.save(key, {
                revision,
                messages: [...messages, { role: 'assistant' as const, content: answer }].slice(-64),
              }, stored?.revision ?? 0, signal), signal)
              metric('persistence.total_ms', clock() - persistenceStarted, 'ms', saved ? 'ok' : 'error')
              if (!saved) {
                metric('conflict.count', 1, 'count', 'error')
                fail(409, 'ASK_PERSISTENCE_CONFLICT', 'The Ask session changed concurrently.', true)
              }
            }
            if (usage?.inputTokens !== undefined) metric('usage.input_tokens', usage.inputTokens, 'tokens', 'ok')
            if (usage?.outputTokens !== undefined) metric('usage.output_tokens', usage.outputTokens, 'tokens', 'ok')
            if (usage?.totalTokens !== undefined) metric('usage.total_tokens', usage.totalTokens, 'tokens', 'ok')
            if (usage?.costUsd !== undefined) metric('cost.usd', usage.costUsd, 'usd', 'ok')
            emit({ type: 'done', ...(usage?.model === undefined ? {} : { model: usage.model }) })
            metric('stream.bytes', bytes, 'bytes', 'ok')
            metric('stream.events', events, 'count', 'ok')
            metric('stream.snapshots', 0, 'count', 'ok')
            metric('request.total_ms', clock() - startedAt, 'ms', 'ok')
          } catch (error) {
            const timeout = !request.signal.aborted && (requestDeadline.aborted || generationDeadline.aborted || generationSignal.aborted)
            const interrupted = signal.aborted || generationSignal.aborted
            const diagnostic = timeout
              ? AskBackendDiagnosticSchema.parse({ code: 'ASK_TIMEOUT', message: 'The Ask request timed out.', retryable: true })
              : interrupted
                ? AskBackendDiagnosticSchema.parse({ code: 'ASK_CANCELLED', message: 'The Ask request was cancelled.', retryable: true })
                : safeFailure(error).diagnostic
            if (!interrupted || timeout) {
              try { emit({ type: 'error', message: diagnostic.message, code: diagnostic.code, retryable: diagnostic.retryable }) } catch { /* response is unavailable */ }
            }
            recordError(interrupted && !timeout ? 'cancelled' : 'error')
          } finally {
            try { controller.close() } catch { /* response was cancelled */ }
          }
        },
        cancel() { responseAbort.abort(); recordError('cancelled') },
      })
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'x-request-id': requestId,
        },
      })
    } catch (error) {
      const deadlineExpired = bootstrap.aborted || workDeadline?.aborted === true
      const cancelled = bootstrapSignal.aborted || request.signal.aborted || deadlineExpired
      const safe = cancelled
        ? new AskServiceError(deadlineExpired ? 408 : 499, { code: deadlineExpired ? 'ASK_TIMEOUT' : 'ASK_CANCELLED', message: deadlineExpired ? 'The Ask request timed out.' : 'The Ask request was cancelled.', retryable: true })
        : safeFailure(error)
      recordError(cancelled ? 'cancelled' : safe.status < 500 ? 'rejected' : 'error')
      return errorResponse(safe, requestId)
    }
  }
}
