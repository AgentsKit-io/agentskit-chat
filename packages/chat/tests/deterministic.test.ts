import type { AdapterFactory, AdapterRequest, Message, StreamChunk } from '@agentskit/core'
import { decodeAssistantContent } from '@agentskit/chat-protocol'
import { localKnowledgeArtifactFixture, staleLocalKnowledgeArtifactFixture } from '@agentskit/chat-protocol/fixtures'
import { describe, expect, it, vi } from 'vitest'

import { createDeterministicAnswerAdapter, createDeterministicAnswerResolver } from '../src/index.js'

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
    const decision = createDeterministicAnswerResolver(localKnowledgeArtifactFixture, { now: () => Date.parse('2026-07-13T12:00:00Z') })
      .resolve('  ＩＮＳＴＡＬＬ\n CLI ')
    expect(decision).toMatchObject({
      outcome: 'answer', normalizedQuery: 'install cli',
      provenance: { source: 'local', entryIds: ['install-cli'] },
      confidence: { level: 'high', basis: 'exact' },
    })
  })

  it('returns choices for ambiguity and escalation for miss or stale data', () => {
    const current = createDeterministicAnswerResolver(localKnowledgeArtifactFixture, { now: () => Date.parse('2026-07-13T12:00:00Z') })
    expect(current.resolve('docs')).toMatchObject({ outcome: 'choices', confidence: { level: 'medium', basis: 'ambiguous' } })
    expect(current.resolve('compare these frameworks')).toMatchObject({ outcome: 'escalation', reason: 'miss', confidence: { level: 'low' } })
    expect(createDeterministicAnswerResolver(staleLocalKnowledgeArtifactFixture, { now: () => Date.parse('2026-07-13T12:00:00Z') }).resolve('install cli'))
      .toMatchObject({ outcome: 'escalation', reason: 'stale' })
  })

  it('never truncates an oversized query into a false exact match', () => {
    const artifact = {
      ...localKnowledgeArtifactFixture,
      entries: [{
        id: 'long', kind: 'restricted-faq' as const, label: 'Long exact key', match: { type: 'exact' as const, values: ['x'.repeat(512)] },
        answer: { markdown: 'Must not match a longer input.', citations: [] },
      }],
    }
    expect(createDeterministicAnswerResolver(artifact, { now: () => Date.parse('2026-07-13T12:00:00Z') }).resolve('x'.repeat(513)))
      .toMatchObject({ outcome: 'escalation', reason: 'miss' })
  })

  it('rejects invalid programmatic artifacts with the AgentsKit config error contract', () => {
    expect(() => createDeterministicAnswerResolver({ ...localKnowledgeArtifactFixture, entries: [{ unsafe: true }] } as never))
      .toThrow('Deterministic knowledge artifact is invalid.')
  })
})

describe('deterministic answer adapter', () => {
  it('answers locally with canonical text and citation components without calling fallback', async () => {
    const fallback = { createSource: vi.fn() } as unknown as AdapterFactory
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: localKnowledgeArtifactFixture, fallback, now: () => Date.parse('2026-07-13T12:00:00Z'),
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
    const chunks = await read(createDeterministicAnswerAdapter({
      artifact: localKnowledgeArtifactFixture, now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('docs')))
    const decoded = decodeAssistantContent(chunks.find(chunk => chunk.type === 'text')?.content)
    expect(decoded.ok && decoded.parts.some(part => part.kind === 'component'
      && part.frame.componentKey === 'choice-list' && part.frame.instanceId === 'choices-user-1')).toBe(true)
  })

  it('preserves the request and delegates misses to the original adapter with safe escalation metadata', () => {
    let aborted = false
    const source = { async *stream() { yield { type: 'done' as const } }, abort() { aborted = true } }
    const fallback: AdapterFactory = { capabilities: { streaming: true }, createSource: vi.fn(() => source) }
    const adapter = createDeterministicAnswerAdapter({
      artifact: localKnowledgeArtifactFixture, fallback, now: () => Date.parse('2026-07-13T12:00:00Z'),
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
      artifact: localKnowledgeArtifactFixture, onDecision: observer, now: () => Date.parse('2026-07-13T12:00:00Z'),
    }).createSource(request('why is this better?')))
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'escalation', reason: 'offline' }))
    expect(chunks[0]?.metadata?.answer).toMatchObject({ reason: 'offline', confidence: { level: 'low', basis: 'offline' } })
  })
})
