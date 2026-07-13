import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import {
  ANSWER_PROTOCOL,
  ANSWER_PROTOCOL_VERSION,
  AnswerCitationSchema,
  AnswerResponseSchema,
  COMPONENT_PROTOCOL,
  COMPONENT_PROTOCOL_VERSION,
  createAssistantContentEncoder,
  decodeAssistantContent,
  isAssistantContentCandidate,
  verifyLocalKnowledgeArtifactSync,
  normalizeKnowledgeKey,
  type AnswerResponse,
  type ComponentRenderFrame,
  type DeterministicKnowledgeEntry,
  type DeterministicSiteConfig,
  type VerifiedLocalKnowledgeArtifact,
} from '@agentskit/chat-protocol'
import { ChoiceListPropsSchema, SourceListPropsSchema } from './catalog.js'
import type { ChoiceSubmissionReservation, ChoiceSubmissionUnavailable } from './index.js'

export const normalizeDeterministicQuery = normalizeKnowledgeKey

export interface DeterministicAnswerResolver {
  readonly resolve: (query: string) => AnswerResponse
  readonly resolveChoice: (choiceId: string, query: string) => AnswerResponse
}

export interface DeterministicAnswerResolverOptions {
  readonly now?: () => number
  readonly expectedContentHash: string
  readonly expectedSiteId: string
}

const baseResponse = (query: string): { readonly protocol: typeof ANSWER_PROTOCOL; readonly version: typeof ANSWER_PROTOCOL_VERSION; readonly query: string; readonly normalizedQuery: string } => ({
  protocol: ANSWER_PROTOCOL,
  version: ANSWER_PROTOCOL_VERSION,
  query: query.slice(0, 512),
  normalizedQuery: normalizeDeterministicQuery(query.slice(0, 512)).slice(0, 512),
})

const escalation = (query: string, reason: 'miss' | 'stale' | 'corrupt' | 'offline', message: string): AnswerResponse =>
  AnswerResponseSchema.parse({
    ...baseResponse(query),
    outcome: 'escalation',
    message,
    reason,
    confidence: { level: 'low', basis: reason },
  })

/** Builds a bounded exact-match index once; no semantic or probabilistic matching is performed. */
export const createDeterministicAnswerResolver = (
  artifactInput: VerifiedLocalKnowledgeArtifact | null,
  options: DeterministicAnswerResolverOptions,
): DeterministicAnswerResolver => {
  const verified = verifyLocalKnowledgeArtifactSync(artifactInput, options)
  if (!verified.ok) return Object.freeze({
    resolve: (query: string) => escalation(query, 'corrupt', 'Local knowledge is corrupt. A backend answer is required.'),
    resolveChoice: (_choiceId: string, query: string) => escalation(query, 'corrupt', 'Local knowledge is corrupt. A backend answer is required.'),
  })
  const artifact = verified.value
  const index = new Map<string, DeterministicKnowledgeEntry[]>()
  const entriesById = new Map(artifact.entries.map(entry => [entry.id, entry] as const))
  for (const entry of artifact.entries) {
    for (const value of entry.match.values) {
      const key = normalizeDeterministicQuery(value)
      const entries = index.get(key) ?? []
      if (!entries.some(candidate => candidate.id === entry.id)) entries.push(entry)
      index.set(key, entries)
    }
  }
  const now = options.now ?? Date.now
  const isStale = (): boolean => artifact.expiresAt !== undefined && Date.parse(artifact.expiresAt) <= now()
  const answerForEntry = (entry: DeterministicKnowledgeEntry, query: string): AnswerResponse => AnswerResponseSchema.parse({
    ...baseResponse(query),
    outcome: 'answer',
    answer: entry.answer,
    provenance: { source: 'local', artifactId: artifact.artifactId, contentHash: artifact.contentHash, entryIds: [entry.id] },
    confidence: { level: 'high', basis: 'exact' },
  })
  const uniqueValue = (entry: DeterministicKnowledgeEntry): string =>
    entry.match.values.find(value => (index.get(normalizeDeterministicQuery(value))?.length ?? 0) === 1) ?? entry.match.values[0] ?? entry.id
  return Object.freeze({
    resolve(query: string): AnswerResponse {
      if (isStale()) {
        return escalation(query, 'stale', 'Local knowledge is stale. A backend answer is required.')
      }
      if (query.length > 512) {
        return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      }
      const normalizedQuery = normalizeDeterministicQuery(query)
      if (normalizedQuery.length > 512) return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      const base = { ...baseResponse(query), normalizedQuery }
      const entries = index.get(base.normalizedQuery) ?? []
      if (entries.length === 0) return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      if (entries.length > 1) {
        return AnswerResponseSchema.parse({
          ...base,
          outcome: 'choices',
          message: 'More than one exact local answer matches. Choose one to continue.',
          suggestions: entries.slice(0, 8).map(entry => ({ id: entry.id, label: entry.label, value: uniqueValue(entry) })),
          provenance: { source: 'local', artifactId: artifact.artifactId, contentHash: artifact.contentHash, entryIds: entries.slice(0, 8).map(entry => entry.id) },
          confidence: { level: 'medium', basis: 'ambiguous' },
        })
      }
      const entry = entries[0]
      if (entry === undefined) return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      return answerForEntry(entry, query)
    },
    resolveChoice(choiceId: string, query: string): AnswerResponse {
      if (isStale()) return escalation(query, 'stale', 'Local knowledge is stale. A backend answer is required.')
      if (query.length > 512) return escalation(query, 'miss', 'The selected local answer is unavailable. A backend answer is required.')
      const normalizedQuery = normalizeDeterministicQuery(query)
      const candidates = normalizedQuery.length <= 512 ? (index.get(normalizedQuery) ?? []).slice(0, 8) : []
      const entry = candidates.some(candidate => candidate.id === choiceId) ? entriesById.get(choiceId) : undefined
      return entry === undefined
        ? escalation(query, 'miss', 'The selected local answer is unavailable. A backend answer is required.')
        : answerForEntry(entry, query)
    },
  })
}

export interface DeterministicAnswerAdapterOptions extends DeterministicAnswerResolverOptions {
  readonly artifact: VerifiedLocalKnowledgeArtifact | null
  readonly fallbackMode: DeterministicSiteConfig['fallback']['mode']
  readonly fallback?: AdapterFactory
  readonly backend?: { readonly provider?: string; readonly model?: string }
  readonly onDecision?: (decision: AnswerResponse) => void | Promise<void>
}

export interface DeterministicAnswerAdapter extends AdapterFactory {
  readonly createSourceForSession: (request: AdapterRequest, sessionId: string) => StreamSource
  readonly releaseChoiceSession: (sessionId: string) => void
  readonly resolveChoiceSubmission: (
    frame: ComponentRenderFrame,
    choiceId: string,
    context: { readonly sessionId: string },
  ) => ChoiceSubmissionReservation | ChoiceSubmissionUnavailable | undefined
}

type ChoiceAnswerResponse = Extract<AnswerResponse, { readonly outcome: 'choices' }>

const latestUserInput = (request: AdapterRequest): { readonly content: string; readonly messageId: string } => {
  const message = request.messages.filter(candidate => candidate.role === 'user').at(-1)
  return { content: message?.content ?? '', messageId: message?.id ?? 'deterministic' }
}

const safeInstanceId = (value: string, fallback: string): string => {
  const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : fallback
}

const projectDecision = (
  decision: AnswerResponse,
  messageId: string,
  rememberChoices: (frame: ComponentRenderFrame, suggestions: ChoiceAnswerResponse) => void,
): string => {
  const encoder = createAssistantContentEncoder()
  const content: string[] = []
  if (decision.outcome === 'answer') {
    content.push(encoder.encode({ kind: 'text', text: decision.answer.markdown }))
    if (decision.answer.citations.length > 0) {
      const props = SourceListPropsSchema.parse({
        label: 'Sources',
        sources: decision.answer.citations.map(citation => ({ id: citation.id, title: citation.title, url: citation.href })),
      })
      content.push(encoder.encode({ kind: 'component', frame: {
        protocol: COMPONENT_PROTOCOL, version: COMPONENT_PROTOCOL_VERSION, type: 'render', componentKey: 'source-list',
        instanceId: safeInstanceId(`sources-${messageId}`, 'deterministic-sources'), props,
        fallback: { kind: 'source-list', summary: `Sources: ${props.sources.map(source => source.title).join(', ')}.` },
      } }))
    }
  } else if (decision.outcome === 'choices') {
    content.push(encoder.encode({ kind: 'text', text: decision.message }))
    const props = ChoiceListPropsSchema.parse({
      prompt: decision.message,
      choices: decision.suggestions.map(suggestion => ({ id: suggestion.id, label: suggestion.label, description: suggestion.value })),
    })
    const frame = {
      protocol: COMPONENT_PROTOCOL, version: COMPONENT_PROTOCOL_VERSION, type: 'render', componentKey: 'choice-list',
      instanceId: safeInstanceId(`deterministic-choices-${messageId}`, 'deterministic-choices'), props,
      fallback: { kind: 'choice-list', summary: `${decision.message} ${props.choices.map(choice => choice.label).join(', ')}.` },
    } as const satisfies ComponentRenderFrame
    rememberChoices(frame, decision)
    content.push(encoder.encode({ kind: 'component', frame }))
  } else {
    content.push(encoder.encode({ kind: 'text', text: decision.message }))
  }
  return content.join('')
}

const localSource = (
  decision: AnswerResponse,
  messageId: string,
  rememberChoices: (frame: ComponentRenderFrame, suggestions: ChoiceAnswerResponse) => void,
): StreamSource => {
  let aborted = false
  return {
    async *stream() {
      if (aborted) return
      yield { type: 'text', content: projectDecision(decision, messageId, rememberChoices), metadata: { answer: decision } }
      if (!aborted) yield { type: 'done' }
    },
    abort() { aborted = true },
  }
}

const observe = (observer: DeterministicAnswerAdapterOptions['onDecision'], decision: AnswerResponse): void => {
  try { void Promise.resolve(observer?.(decision)).catch(() => undefined) } catch { /* observer isolation */ }
}

const backendAnswer = (query: string, content: string, backend: DeterministicAnswerAdapterOptions['backend']): AnswerResponse | undefined => {
  const decoded = decodeAssistantContent(content)
  if (!decoded.ok && isAssistantContentCandidate(content)) {
    return escalation(query, 'corrupt', 'Backend answer contained invalid ordered content.')
  }
  if (decoded.ok && !decoded.complete) {
    return escalation(query, 'corrupt', 'Backend answer ended with incomplete ordered content.')
  }
  const markdown = (decoded.ok
    ? decoded.parts.flatMap(part => part.kind === 'text' ? [part.text] : []).join('')
    : content).trim()
  if (markdown === '') return undefined
  if (markdown.length > 16_384) {
    return escalation(query, 'corrupt', 'Backend answer exceeded the unified response limit.')
  }
  const citations = decoded.ok
    ? decoded.parts.flatMap(part => {
        if (part.kind !== 'component' || part.frame.componentKey !== 'source-list') return []
        const sources = SourceListPropsSchema.safeParse(part.frame.props)
        if (!sources.success) return []
        return sources.data.sources.flatMap(source => {
          if (source.url === undefined) return []
          const citation = AnswerCitationSchema.safeParse({ id: source.id, title: source.title, href: source.url })
          return citation.success ? [citation.data] : []
        })
      }).slice(0, 8)
    : []
  return AnswerResponseSchema.parse({
    ...baseResponse(query),
    outcome: 'answer',
    answer: { markdown, citations },
    provenance: { source: 'backend', ...backend },
    confidence: { level: 'high', basis: 'backend' },
  })
}

const observeBackendSource = (
  source: StreamSource,
  query: string,
  backend: DeterministicAnswerAdapterOptions['backend'],
  observer: DeterministicAnswerAdapterOptions['onDecision'],
): StreamSource => ({
  abort: () => source.abort(),
  async *stream(): AsyncIterableIterator<StreamChunk> {
    let content = ''
    let overflowed = false
    let completed = false
    let failed = false
    const finalize = (): AnswerResponse | undefined => overflowed
      ? escalation(query, 'corrupt', 'Backend stream exceeded the observation limit.')
      : backendAnswer(query, content, backend)
    for await (const chunk of source.stream()) {
      if (chunk.type === 'text') {
        const incoming = chunk.content ?? ''
        const remaining = 262_144 - content.length
        if (incoming.length > remaining) overflowed = true
        if (remaining > 0) content += incoming.slice(0, remaining)
      }
      if (chunk.type === 'error') failed = true
      if (chunk.type !== 'done') {
        yield chunk
        continue
      }
      completed = true
      if (failed) {
        yield chunk
        continue
      }
      const answer = finalize()
      if (answer === undefined) {
        yield chunk
      } else {
        observe(observer, answer)
        yield { ...chunk, metadata: { ...chunk.metadata, answer } }
      }
    }
    if (!completed && !failed) {
      const answer = finalize()
      if (answer !== undefined) {
        observe(observer, answer)
        yield { type: 'done', metadata: { answer } }
      }
    }
  },
})

/** Composes the local answer plane in front of an existing AgentsKit adapter. */
export const createDeterministicAnswerAdapter = (options: DeterministicAnswerAdapterOptions): DeterministicAnswerAdapter => {
  const resolver = createDeterministicAnswerResolver(options.artifact, options)
  type ChoiceAuthorization = { readonly props: string; readonly values: ReadonlyMap<string, string>; claimed: boolean }
  const MAX_CHOICE_SESSIONS = 256
  const MAX_SESSION_CHOICES = 256
  const choices = new Map<string, Map<string, ChoiceAuthorization>>()
  const rememberChoices = (sessionId: string, frame: ComponentRenderFrame, decision: ChoiceAnswerResponse): void => {
    let sessionChoices = choices.get(sessionId)
    if (sessionChoices === undefined) {
      if (choices.size >= MAX_CHOICE_SESSIONS) {
        const evictable = [...choices].find(([, authorizations]) =>
          [...authorizations.values()].every(authorization => !authorization.claimed),
        )?.[0]
        if (evictable === undefined) return
        choices.delete(evictable)
      }
      sessionChoices = new Map<string, ChoiceAuthorization>()
    } else {
      choices.delete(sessionId)
    }
    const previous = sessionChoices.get(frame.instanceId)
    if (previous?.claimed) {
      choices.set(sessionId, sessionChoices)
      return
    }
    if (previous === undefined && sessionChoices.size >= MAX_SESSION_CHOICES) {
      const evictable = [...sessionChoices].find(([, authorization]) => !authorization.claimed)?.[0]
      if (evictable === undefined) {
        choices.set(sessionId, sessionChoices)
        return
      }
      sessionChoices.delete(evictable)
    }
    sessionChoices.set(frame.instanceId, {
      props: JSON.stringify(frame.props),
      values: new Map(decision.suggestions.map(suggestion => [suggestion.id, suggestion.value] as const)),
      claimed: false,
    })
    choices.set(sessionId, sessionChoices)
  }
  const createSourceForSession = (request: AdapterRequest, sessionId: string): StreamSource => {
    const rememberSessionChoices = (frame: ComponentRenderFrame, decision: ChoiceAnswerResponse): void =>
      rememberChoices(sessionId, frame, decision)
    const user = latestUserInput(request)
    const decision = resolver.resolve(user.content)
    if (decision.outcome !== 'escalation') {
      observe(options.onDecision, decision)
      return localSource(decision, user.messageId, rememberSessionChoices)
    }
    if (options.fallbackMode === 'disabled' || options.fallback === undefined) {
      const unavailable = decision.reason === 'miss'
        ? escalation(decision.query, 'offline', 'This question needs the backend, which is not available.')
        : decision
      observe(options.onDecision, unavailable)
      return localSource(unavailable, user.messageId, rememberSessionChoices)
    }
    observe(options.onDecision, decision)
    const source = options.fallback.createSource({
      ...request,
      context: {
        ...request.context,
        metadata: { ...request.context?.metadata, 'agentskit.chat.escalation': decision },
      },
    })
    return observeBackendSource(source, decision.query, options.backend, options.onDecision)
  }
  return {
    capabilities: options.fallbackMode === 'backend'
      ? (options.fallback?.capabilities ?? { streaming: true, structuredOutput: true })
      : { streaming: true, structuredOutput: true },
    createSource: request => createSourceForSession(request, 'unscoped'),
    createSourceForSession,
    releaseChoiceSession: sessionId => { choices.delete(sessionId) },
    resolveChoiceSubmission(frame, choiceId, context) {
      const unavailable = (): ChoiceSubmissionUnavailable | undefined =>
        frame.instanceId.startsWith('deterministic-choices-') ? { unavailable: true } : undefined
      const sessionChoices = choices.get(context.sessionId)
      if (sessionChoices === undefined) return unavailable()
      const remembered = sessionChoices.get(frame.instanceId)
      if (remembered === undefined || remembered.claimed || remembered.props !== JSON.stringify(frame.props)) return unavailable()
      const value = remembered.values.get(choiceId)
      if (value === undefined) return unavailable()
      choices.delete(context.sessionId)
      choices.set(context.sessionId, sessionChoices)
      remembered.claimed = true
      let settled = false
      return {
        value,
        commit() {
          if (settled) return
          settled = true
          sessionChoices.delete(frame.instanceId)
          if (sessionChoices.size === 0 && choices.get(context.sessionId) === sessionChoices) choices.delete(context.sessionId)
        },
        release() {
          if (settled) return
          settled = true
          remembered.claimed = false
        },
      }
    },
  }
}
