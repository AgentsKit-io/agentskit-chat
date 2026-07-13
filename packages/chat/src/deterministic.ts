import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import {
  ANSWER_PROTOCOL,
  ANSWER_PROTOCOL_VERSION,
  AnswerResponseSchema,
  COMPONENT_PROTOCOL,
  COMPONENT_PROTOCOL_VERSION,
  createAssistantContentEncoder,
  LocalKnowledgeArtifactSchema,
  normalizeKnowledgeKey,
  type AnswerResponse,
  type DeterministicKnowledgeEntry,
  type LocalKnowledgeArtifact,
} from '@agentskit/chat-protocol'
import { ChoiceListPropsSchema, SourceListPropsSchema } from './catalog.js'

export const normalizeDeterministicQuery = normalizeKnowledgeKey

export interface DeterministicAnswerResolver {
  readonly resolve: (query: string) => AnswerResponse
}

export interface DeterministicAnswerResolverOptions {
  readonly now?: () => number
}

const invalidArtifact = (): never => {
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message: 'Deterministic knowledge artifact is invalid.',
    hint: 'Decode and validate the versioned local artifact before creating the deterministic resolver.',
  })
}

const baseResponse = (query: string): { readonly protocol: typeof ANSWER_PROTOCOL; readonly version: typeof ANSWER_PROTOCOL_VERSION; readonly query: string; readonly normalizedQuery: string } => ({
  protocol: ANSWER_PROTOCOL,
  version: ANSWER_PROTOCOL_VERSION,
  query: query.slice(0, 512),
  normalizedQuery: normalizeDeterministicQuery(query).slice(0, 512),
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
  artifactInput: LocalKnowledgeArtifact,
  options: DeterministicAnswerResolverOptions = {},
): DeterministicAnswerResolver => {
  const parsed = LocalKnowledgeArtifactSchema.safeParse(artifactInput)
  if (!parsed.success) return invalidArtifact()
  const artifact = parsed.data
  const index = new Map<string, DeterministicKnowledgeEntry[]>()
  for (const entry of artifact.entries) {
    for (const value of entry.match.values) {
      const key = normalizeDeterministicQuery(value)
      const entries = index.get(key) ?? []
      if (!entries.some(candidate => candidate.id === entry.id)) entries.push(entry)
      index.set(key, entries)
    }
  }
  const now = options.now ?? Date.now
  return Object.freeze({
    resolve(query: string): AnswerResponse {
      const base = baseResponse(query)
      if (artifact.expiresAt !== undefined && Date.parse(artifact.expiresAt) <= now()) {
        return escalation(query, 'stale', 'Local knowledge is stale. A backend answer is required.')
      }
      if (query.length > 512 || normalizeDeterministicQuery(query).length > 512) {
        return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      }
      const entries = index.get(base.normalizedQuery) ?? []
      if (entries.length === 0) return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      if (entries.length > 1) {
        return AnswerResponseSchema.parse({
          ...base,
          outcome: 'choices',
          message: 'More than one exact local answer matches. Choose one to continue.',
          suggestions: entries.slice(0, 8).map(entry => ({ id: entry.id, label: entry.label, value: entry.match.values[0] })),
          provenance: { source: 'local', artifactId: artifact.artifactId, contentHash: artifact.contentHash, entryIds: entries.slice(0, 8).map(entry => entry.id) },
          confidence: { level: 'medium', basis: 'ambiguous' },
        })
      }
      const entry = entries[0]
      if (entry === undefined) return escalation(query, 'miss', 'No exact local answer was found. A backend answer is required.')
      return AnswerResponseSchema.parse({
        ...base,
        outcome: 'answer',
        answer: entry.answer,
        provenance: { source: 'local', artifactId: artifact.artifactId, contentHash: artifact.contentHash, entryIds: [entry.id] },
        confidence: { level: 'high', basis: 'exact' },
      })
    },
  })
}

export interface DeterministicAnswerAdapterOptions extends DeterministicAnswerResolverOptions {
  readonly artifact: LocalKnowledgeArtifact
  readonly fallback?: AdapterFactory
  readonly onDecision?: (decision: AnswerResponse) => void | Promise<void>
}

const latestUserInput = (request: AdapterRequest): { readonly content: string; readonly messageId: string } => {
  const message = request.messages.filter(candidate => candidate.role === 'user').at(-1)
  return { content: message?.content ?? '', messageId: message?.id ?? 'deterministic' }
}

const safeInstanceId = (value: string, fallback: string): string => {
  const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : fallback
}

const projectDecision = (decision: AnswerResponse, messageId: string): string => {
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
    content.push(encoder.encode({ kind: 'component', frame: {
      protocol: COMPONENT_PROTOCOL, version: COMPONENT_PROTOCOL_VERSION, type: 'render', componentKey: 'choice-list',
      instanceId: safeInstanceId(`choices-${messageId}`, 'deterministic-choices'), props,
      fallback: { kind: 'choice-list', summary: `${decision.message} ${props.choices.map(choice => choice.label).join(', ')}.` },
    } }))
  } else {
    content.push(encoder.encode({ kind: 'text', text: decision.message }))
  }
  return content.join('')
}

const localSource = (decision: AnswerResponse, messageId: string): StreamSource => {
  let aborted = false
  return {
    async *stream() {
      if (aborted) return
      yield { type: 'text', content: projectDecision(decision, messageId), metadata: { answer: decision } }
      if (!aborted) yield { type: 'done' }
    },
    abort() { aborted = true },
  }
}

const observe = (observer: DeterministicAnswerAdapterOptions['onDecision'], decision: AnswerResponse): void => {
  try { void Promise.resolve(observer?.(decision)).catch(() => undefined) } catch { /* observer isolation */ }
}

/** Composes the local answer plane in front of an existing AgentsKit adapter. */
export const createDeterministicAnswerAdapter = (options: DeterministicAnswerAdapterOptions): AdapterFactory => {
  const resolver = createDeterministicAnswerResolver(options.artifact, options)
  return {
    capabilities: options.fallback?.capabilities ?? { streaming: true, structuredOutput: true },
    createSource(request) {
      const user = latestUserInput(request)
      const decision = resolver.resolve(user.content)
      if (decision.outcome !== 'escalation') {
        observe(options.onDecision, decision)
        return localSource(decision, user.messageId)
      }
      if (options.fallback === undefined) {
        const offline = escalation(decision.query, 'offline', 'This question needs the backend, which is not available.')
        observe(options.onDecision, offline)
        return localSource(offline, user.messageId)
      }
      observe(options.onDecision, decision)
      return options.fallback.createSource({
        ...request,
        context: {
          ...request.context,
          metadata: { ...request.context?.metadata, 'agentskit.chat.escalation': decision },
        },
      })
    },
  }
}
