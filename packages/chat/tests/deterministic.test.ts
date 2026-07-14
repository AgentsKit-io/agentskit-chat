import type { AdapterFactory, AdapterRequest, Message, StreamChunk } from '@agentskit/core'
import {
  computeLocalKnowledgeArtifactContentHash,
  createAssistantContentEncoder,
  decodeAssistantContent,
  verifyLocalKnowledgeArtifact,
  type ComponentRenderFrame,
  type LocalKnowledgeArtifact,
  type VerifiedLocalKnowledgeArtifact,
} from '@agentskit/chat-protocol'
import { localKnowledgeArtifactFixture, staleLocalKnowledgeArtifactFixture } from '@agentskit/chat-protocol/fixtures'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createDeterministicAnswerAdapter, createDeterministicAnswerResolver } from '../src/index.js'

const verifyFixture = async (artifact: LocalKnowledgeArtifact): Promise<VerifiedLocalKnowledgeArtifact> => {
  const contentHash = await computeLocalKnowledgeArtifactContentHash(artifact)
  const candidate = { ...artifact, contentHash }
  const decoded = await verifyLocalKnowledgeArtifact(candidate, { expectedContentHash: contentHash, expectedSiteId: candidate.siteId })
  if (!decoded.ok) throw new Error(decoded.diagnostic.message)
  return decoded.value
}

let verifiedArtifact: VerifiedLocalKnowledgeArtifact
let verifiedStaleArtifact: VerifiedLocalKnowledgeArtifact
beforeAll(async () => {
  verifiedArtifact = await verifyFixture(localKnowledgeArtifactFixture)
  verifiedStaleArtifact = await verifyFixture(staleLocalKnowledgeArtifactFixture)
})
const fixtureNow = (): number => Date.parse('2026-07-13T12:00:00Z')
const trust = (artifact: LocalKnowledgeArtifact) => ({
  expectedContentHash: artifact.contentHash,
  expectedSiteId: artifact.siteId,
  now: fixtureNow,
})

const message = (content: string): Message => ({
  id: 'user-1', role: 'user', content, status: 'complete', createdAt: new Date(0),
})

const request = (content: string): AdapterRequest => ({
  messages: [message(content)],
  context: { systemPrompt: 'Keep me', metadata: { tenant: 'docs' } },
})

const read = async (source: ReturnType<AdapterFactory['createSource']>): Promise<StreamChunk[]> => {
  const chunks: StreamChunk[] = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  return chunks
}

describe('deterministic answer resolver', () => {
  it('returns a high-confidence local answer for normalized exact matches', () => {
    const decision = createDeterministicAnswerResolver(verifiedArtifact, { ...trust(localKnowledgeArtifactFixture), now: () => Date.parse('2026-07-13T12:00:00Z') })
      .resolve('  ＩＮＳＴＡＬＬ\n CLI ')
    expect(decision).toMatchObject({
      outcome: 'answer', normalizedQuery: 'install cli',
      provenance: { source: 'local', entryIds: ['install-cli'] },
      confidence: { level: 'high', basis: 'exact' },
    })
  })

  it('returns choices for ambiguity and escalation for miss or stale data', () => {
    const current = createDeterministicAnswerResolver(verifiedArtifact, { ...trust(localKnowledgeArtifactFixture), now: () => Date.parse('2026-07-13T12:00:00Z') })
    expect(current.resolve('docs')).toMatchObject({
      outcome: 'choices',
      suggestions: [
        { id: 'docs-agentskit', value: 'agentskit docs' },
        { id: 'docs-registry', value: 'registry docs' },
      ],
      confidence: { level: 'medium', basis: 'ambiguous' },
    })
    expect(current.resolveChoice('docs-registry', 'docs')).toMatchObject({
      outcome: 'answer', answer: { markdown: 'Open the Registry documentation.' }, provenance: { entryIds: ['docs-registry'] },
    })
    expect(current.resolveChoice('install-cli', 'docs')).toMatchObject({ outcome: 'escalation', reason: 'miss' })
    expect(current.resolve('compare these frameworks')).toMatchObject({ outcome: 'escalation', reason: 'miss', confidence: { level: 'low' } })
    expect(createDeterministicAnswerResolver(verifiedStaleArtifact, { ...trust(staleLocalKnowledgeArtifactFixture), now: () => Date.parse('2026-07-13T12:00:00Z') }).resolve('install cli'))
      .toMatchObject({ outcome: 'escalation', reason: 'stale' })
  })

  it('never truncates an oversized query into a false exact match', async () => {
    const artifact = {
      ...localKnowledgeArtifactFixture,
      entries: [{
        id: 'long', kind: 'restricted-faq' as const, label: 'Long exact key', match: { type: 'exact' as const, values: ['x'.repeat(512)] },
        answer: { markdown: 'Must not match a longer input.', citations: [] },
      }],
    }
    const verified = await verifyFixture(artifact)
    expect(createDeterministicAnswerResolver(verified, { ...trust(verified), now: () => Date.parse('2026-07-13T12:00:00Z') }).resolve('x'.repeat(513)))
      .toMatchObject({ outcome: 'escalation', reason: 'miss' })
  })

  it('turns a failed verification sentinel into inert corrupt escalation', () => {
    expect(createDeterministicAnswerResolver(null, trust(localKnowledgeArtifactFixture)).resolve('install cli')).toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
    const tampered = { ...localKnowledgeArtifactFixture, entries: localKnowledgeArtifactFixture.entries.map((entry, index) => (
      index === 0 ? { ...entry, answer: { ...entry.answer, markdown: 'Tampered.' } } : entry
    )) }
    expect(createDeterministicAnswerResolver(tampered as never, trust(localKnowledgeArtifactFixture)).resolve('install cli'))
      .toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
  })

  it('handles Unicode normalization expansion as a bounded miss', () => {
    expect(createDeterministicAnswerResolver(verifiedArtifact, trust(localKnowledgeArtifactFixture)).resolve('\uFDFA'.repeat(100)))
      .toMatchObject({ outcome: 'escalation', reason: 'miss' })
  })
})

describe('deterministic answer adapter', () => {
  it('answers locally with canonical text and citation components without calling fallback', async () => {
    const fallback = { createSource: vi.fn() } as unknown as AdapterFactory
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback, now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('install cli')))
    expect(fallback.createSource).not.toHaveBeenCalled()
    const content = chunks.filter(chunk => chunk.type === 'text').map(chunk => chunk.content ?? '').join('')
    const decoded = decodeAssistantContent(content)
    expect(decoded.ok && decoded.parts).toEqual([
      { kind: 'text', text: 'Run `npm install agentskit`.' },
      { kind: 'component', frame: expect.objectContaining({ componentKey: 'source-list', instanceId: 'sources-user-1' }) },
    ])
    expect(chunks[0]?.metadata?.answer).toMatchObject({ outcome: 'answer', provenance: { source: 'local' } })
    expect(chunks.at(-1)).toEqual({ type: 'done' })
  })

  it('renders ambiguous matches as a standard choice-list component', async () => {
    const adapter = createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled', now: () => Date.parse('2026-07-13T12:00:00Z'),
    })
    const chunks = await read(adapter.createSource(request('docs')))
    const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text')?.content)
    expect(decoded.ok && decoded.parts.some(part => part.kind === 'component'
      && part.frame.componentKey === 'choice-list' && part.frame.instanceId === 'deterministic-choices-user-1'
      && Array.isArray(part.frame.props.choices)
      && part.frame.props.choices[0]?.description === 'agentskit docs')).toBe(true)
    if (!decoded.ok) throw new Error(decoded.diagnostic.message)
    const frame = decoded.parts.find(part => part.kind === 'component')?.frame
    if (frame === undefined) throw new Error('Expected deterministic ChoiceList frame.')
    const context = { sessionId: 'unscoped' }
    expect(adapter.resolveChoiceSubmission(frame, 'not-offered', context)).toEqual({ unavailable: true })
    const reservation = adapter.resolveChoiceSubmission(frame, 'docs-agentskit', context)
    expect(reservation?.value).toBe('agentskit docs')
    expect(adapter.resolveChoiceSubmission(frame, 'docs-agentskit', context)).toEqual({ unavailable: true })
    reservation?.release()
    const retry = adapter.resolveChoiceSubmission(frame, 'docs-agentskit', context)
    expect(retry?.value).toBe('agentskit docs')
    retry?.commit()
    expect(adapter.resolveChoiceSubmission(frame, 'docs-agentskit', context)).toEqual({ unavailable: true })
    expect(adapter.resolveChoiceSubmission({ ...frame, instanceId: 'deterministic-choices-forged' }, 'docs-agentskit', context)).toEqual({ unavailable: true })
  })

  it('isolates choice authorizations for concurrent sessions with the same message id', async () => {
    const adapter = createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled',
    })
    const [firstChunks, secondChunks] = await Promise.all([
      read(adapter.createSourceForSession(request('docs'), 'session-a')),
      read(adapter.createSourceForSession(request('docs'), 'session-b')),
    ])
    const frameFrom = (chunks: StreamChunk[]) => {
      const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text')?.content)
      if (!decoded.ok) throw new Error(decoded.diagnostic.message)
      const frame = decoded.parts.find(part => part.kind === 'component')?.frame
      if (frame === undefined) throw new Error('Expected deterministic ChoiceList frame.')
      return frame
    }
    const first = adapter.resolveChoiceSubmission(frameFrom(firstChunks), 'docs-agentskit', { sessionId: 'session-a' })
    const second = adapter.resolveChoiceSubmission(frameFrom(secondChunks), 'docs-agentskit', { sessionId: 'session-b' })
    expect(first?.value).toBe('agentskit docs')
    expect(second?.value).toBe('agentskit docs')
    first?.commit(); second?.commit()
  })

  it('bounds abandoned sessions without evicting a claimed reservation', async () => {
    const adapter = createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled',
    })
    const firstChunks = await read(adapter.createSourceForSession(request('docs'), 'protected-session'))
    const firstDecoded = decodeAssistantContent(firstChunks.find(chunk => chunk.type === 'text')?.content)
    if (!firstDecoded.ok) throw new Error(firstDecoded.diagnostic.message)
    const firstFrame = firstDecoded.parts.find(part => part.kind === 'component')?.frame
    if (firstFrame === undefined) throw new Error('Expected protected ChoiceList frame.')
    const claimed = adapter.resolveChoiceSubmission(firstFrame, 'docs-agentskit', { sessionId: 'protected-session' })
    expect(claimed?.value).toBe('agentskit docs')
    let evictedFrame: ComponentRenderFrame | undefined
    for (let index = 0; index < 260; index += 1) {
      const chunks = await read(adapter.createSourceForSession(request('docs'), `abandoned-${index}`))
      if (index === 0) {
        const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text')?.content)
        if (decoded.ok) evictedFrame = decoded.parts.find(part => part.kind === 'component')?.frame
      }
    }
    claimed?.release()
    expect(adapter.resolveChoiceSubmission(firstFrame, 'docs-agentskit', { sessionId: 'protected-session' })?.value).toBe('agentskit docs')
    adapter.releaseChoiceSession('protected-session')
    expect(adapter.resolveChoiceSubmission(firstFrame, 'docs-agentskit', { sessionId: 'protected-session' })).toEqual({ unavailable: true })
    expect(evictedFrame).toBeDefined()
    expect(adapter.resolveChoiceSubmission(evictedFrame!, 'docs-agentskit', { sessionId: 'abandoned-0' })).toEqual({ unavailable: true })
  })

  it('does not let a late commit delete a recreated session', async () => {
    const adapter = createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled',
    })
    const frameFrom = async () => {
      const chunks = await read(adapter.createSourceForSession(request('docs'), 'reused-session'))
      const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text')?.content)
      if (!decoded.ok) throw new Error(decoded.diagnostic.message)
      const frame = decoded.parts.find(part => part.kind === 'component')?.frame
      if (frame === undefined) throw new Error('Expected ChoiceList frame.')
      return frame
    }
    const oldFrame = await frameFrom()
    const oldReservation = adapter.resolveChoiceSubmission(oldFrame, 'docs-agentskit', { sessionId: 'reused-session' })
    if (oldReservation === undefined || 'unavailable' in oldReservation) throw new Error('Expected old reservation.')
    adapter.releaseChoiceSession('reused-session')
    const newFrame = await frameFrom()
    oldReservation.commit()
    const current = adapter.resolveChoiceSubmission(newFrame, 'docs-agentskit', { sessionId: 'reused-session' })
    expect(current && 'value' in current ? current.value : undefined).toBe('agentskit docs')
  })

  it('preserves the request and delegates misses to the original adapter with safe escalation metadata', () => {
    let aborted = false
    const source = { async *stream() { yield { type: 'done' as const } }, abort() { aborted = true } }
    const fallback: AdapterFactory = { capabilities: { streaming: true }, createSource: vi.fn(() => source) }
    const adapter = createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback, now: () => Date.parse('2026-07-13T12:00:00Z'),
    })
    const original = request('compare these frameworks')
    const delegated = adapter.createSource(original)
    expect(adapter.capabilities).toBe(fallback.capabilities)
    expect(fallback.createSource).toHaveBeenCalledWith({
      ...original,
      context: {
        ...original.context,
        metadata: {
          tenant: 'docs',
          'agentskit.chat.escalation': expect.objectContaining({ outcome: 'escalation', reason: 'miss', query: 'compare these frameworks' }),
        },
      },
    })
    delegated.abort()
    expect(aborted).toBe(true)
  })

  it('returns a safe offline escalation when no backend exists', async () => {
    const observer = vi.fn(() => { throw new Error('observer failure') })
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled', onDecision: observer, now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('why is this better?')))
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'escalation', reason: 'offline' }))
    expect(chunks[0]?.metadata?.answer).toMatchObject({ reason: 'offline', confidence: { level: 'low', basis: 'offline' } })
  })

  it('never calls a supplied backend when fallback mode is disabled', async () => {
    const fallback = { createSource: vi.fn() } as unknown as AdapterFactory
    await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled', fallback,
      now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('unknown')))
    expect(fallback.createSource).not.toHaveBeenCalled()
  })

  it('adds a unified backend answer envelope to the final streamed chunk', async () => {
    const encoder = createAssistantContentEncoder()
    const streamedContent = encoder.encode({ kind: 'text', text: 'Backend answer.' }) + encoder.encode({
      kind: 'component',
      frame: {
        protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'source-list', instanceId: 'backend-sources',
        props: { label: 'Sources', sources: [{ id: 'source-1', title: 'Backend source', url: '/docs/backend' }] },
        fallback: { kind: 'source-list', summary: 'Backend source.' },
      },
    })
    const fallback: AdapterFactory = {
      createSource: () => ({
        async *stream() {
          yield { type: 'text' as const, content: streamedContent }
          yield { type: 'done' as const, metadata: { answer: {
            protocol: 'agentskit.chat.answer', version: 1, outcome: 'answer', query: 'other question', normalizedQuery: 'other question',
            answer: { markdown: 'Unrelated claim.', citations: [] }, provenance: { source: 'backend' }, confidence: { level: 'high', basis: 'backend' },
          } } }
        },
        abort() {},
      }),
    }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact,
      ...trust(localKnowledgeArtifactFixture),
      fallbackMode: 'backend',
      fallback,
      backend: { provider: 'ask', model: 'configured-by-host' },
      now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('compare frameworks')))
    expect(chunks.at(-1)?.metadata?.answer).toMatchObject({
      outcome: 'answer', answer: { markdown: 'Backend answer.', citations: [{ id: 'source-1', title: 'Backend source', href: '/docs/backend' }] },
      provenance: { source: 'backend', provider: 'ask', model: 'configured-by-host' },
      confidence: { level: 'high', basis: 'backend' },
    })
  })

  it('reports oversized backend output without claiming a truncated high-confidence answer', async () => {
    const visible = 'x'.repeat(20_000)
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: visible }; yield { type: 'done' as const } },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
    }).createSource(request('long backend answer')))
    expect(chunks.find(chunk => chunk.type === 'text')?.content).toBe(visible)
    expect(chunks.at(-1)?.metadata?.answer).toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
  })

  it('reports incomplete ordered backend content without claiming a high-confidence answer', async () => {
    const encoder = createAssistantContentEncoder()
    const incomplete = encoder.encode({ kind: 'text', text: 'Completed prefix.' }) + '{"kind":"component"'
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: incomplete }; yield { type: 'done' as const } },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
    }).createSource(request('incomplete backend answer')))
    expect(chunks.find(chunk => chunk.type === 'text')?.content).toBe(incomplete)
    expect(chunks.at(-1)?.metadata?.answer).toMatchObject({ outcome: 'escalation', reason: 'corrupt', confidence: { level: 'low' } })
  })

  it('reports malformed ordered backend content as corrupt', async () => {
    const malformed = '\u001eagentskit.chat.content/1\n{bad}\n'
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: malformed }; yield { type: 'done' as const } },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
    }).createSource(request('malformed backend answer')))
    expect(chunks.at(-1)?.metadata?.answer).toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
  })

  it('synthesizes the final answer envelope when the upstream iterator ends without done', async () => {
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: 'Naturally completed answer.' } },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
      backend: { provider: 'natural-end' },
    }).createSource(request('natural completion')))
    expect(chunks.at(-1)).toMatchObject({
      type: 'done', metadata: { answer: { outcome: 'answer', provenance: { source: 'backend', provider: 'natural-end' } } },
    })
  })

  it('does not synthesize a successful answer after an upstream error chunk', async () => {
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() {
        yield { type: 'text' as const, content: 'Partial answer.' }
        yield { type: 'error' as const, error: new Error('backend failed') }
      },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
    }).createSource(request('failing backend')))
    expect(chunks.map(chunk => chunk.type)).toEqual(['text', 'error'])
    expect(chunks.some(chunk => chunk.metadata?.answer !== undefined)).toBe(false)
  })

  it('reports backend observation overflow without changing the visible stream', async () => {
    const visible = 'x'.repeat(262_145)
    const fallback: AdapterFactory = { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: visible }; yield { type: 'done' as const } },
      abort() {},
    }) }
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: verifiedArtifact, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback,
    }).createSource(request('overflowing backend stream')))
    expect(chunks.find(chunk => chunk.type === 'text')?.content).toBe(visible)
    expect(chunks.at(-1)?.metadata?.answer).toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
  })

  it('delegates corrupt artifacts to backend instead of throwing during startup', () => {
    const fallback: AdapterFactory = { createSource: vi.fn(() => ({ async *stream() {}, abort() {} })) }
    const adapter = createDeterministicAnswerAdapter({ artifact: null, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'backend', fallback })
    expect(() => adapter.createSource(request('install cli'))).not.toThrow()
    expect(fallback.createSource).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ metadata: expect.objectContaining({
        'agentskit.chat.escalation': expect.objectContaining({ reason: 'corrupt' }),
      }) }),
    }))
  })

  it('exposes corrupt escalation when no backend is allowed', async () => {
    const chunks = await read(createDeterministicAnswerAdapter({ artifact: null, ...trust(localKnowledgeArtifactFixture), fallbackMode: 'disabled' })
      .createSource(request('install cli')))
    expect(chunks[0]?.metadata?.answer).toMatchObject({ outcome: 'escalation', reason: 'corrupt' })
  })
})
