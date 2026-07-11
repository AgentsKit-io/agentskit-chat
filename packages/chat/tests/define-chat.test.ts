import { ConfigError, createChatController } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { describe, expect, it } from 'vitest'

import {
  ChoiceListComponent,
  commandRoute, createChatSession, defineChat, defineComponentManifest, formatSemanticFallback, parseSemanticFallback,
  resolveChoiceListFrame,
  resolveComponentFrame,
  selectChoice,
  type TurnTrace,
} from '../src/index.js'
import { validChoiceListFrame } from '../../protocol/src/fixtures.js'

const adapter: AdapterFactory = {
  createSource: () => ({
    async *stream() {
      yield { type: 'done' }
    },
    abort() {},
  }),
}

describe('defineChat', () => {
  it('preserves the definition and upstream ChatConfig reference', () => {
    const chat = { adapter }
    const definition = defineChat({ id: 'support', chat })

    expect(definition).toEqual({ id: 'support', chat })
    expect(definition.chat).toBe(chat)
  })
})

describe('semantic fallback', () => {
  it('validates and formats a framework-neutral fallback', () => {
    const fallback = parseSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' })
    expect(formatSemanticFallback(fallback)).toBe('[unsupported visual: chart] Revenue rose 12%.')
  })

  it('rejects empty fallback fields at the runtime boundary', () => {
    expect(() => parseSemanticFallback({ kind: '', summary: 'Missing kind.' })).toThrow()
  })
})

describe('component manifest', () => {
  const manifest = defineComponentManifest([ChoiceListComponent])

  it('validates a registered ChoiceList and creates its semantic event', () => {
    const resolved = resolveChoiceListFrame(validChoiceListFrame, manifest)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.props).toEqual(validChoiceListFrame.props)
    expect(selectChoice(resolved.frame, 'docs')).toMatchObject({ type: 'select', choiceId: 'docs' })
  })

  it('keeps unknown and invalid component frames inert', () => {
    expect(resolveComponentFrame({ ...validChoiceListFrame, componentKey: 'future' }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_UNKNOWN' },
    })
    expect(resolveComponentFrame({ ...validChoiceListFrame, props: { prompt: '', choices: [] } }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_INVALID_PROPS' },
    })
    expect(resolveComponentFrame({ ...validChoiceListFrame, componentKey: 'constructor' }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_UNKNOWN' },
    })
  })

  it('rejects duplicate manifest keys and undeclared choices', () => {
    expect(() => defineComponentManifest([ChoiceListComponent, ChoiceListComponent])).toThrow(ConfigError)
    expect(() => selectChoice(validChoiceListFrame, 'missing')).toThrow(ConfigError)
    expect(() => selectChoice({ ...validChoiceListFrame, componentKey: 'other' }, 'docs')).toThrow(ConfigError)
    expect(() => defineComponentManifest([{ key: 'Invalid Key', propsSchema: ChoiceListComponent.propsSchema }])).toThrow(ConfigError)
  })
})

const request = (content: string, id = 'user-1', previous: AdapterRequest['messages'] = []): AdapterRequest => ({
  messages: [...previous, { id, role: 'user', content, status: 'complete', createdAt: new Date() }],
})

const read = async (source: ReturnType<AdapterFactory['createSource']>): Promise<StreamChunk[]> => {
  const chunks: StreamChunk[] = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  return chunks
}

describe('deterministic conversation session', () => {
  it('advances a known multi-turn flow before model dispatch', async () => {
    let agentCalls = 0
    const traces: TurnTrace[] = []
    const definition = defineChat({
      id: 'onboarding',
      chat: { adapter: { createSource: () => { agentCalls += 1; return adapter.createSource(request('agent')) } } },
      conversation: {
        initial: 'idle',
        states: {
          idle: { on: { start: 'collecting' }, actions: ['begin'] },
          collecting: { on: { finish: 'complete' }, actions: ['cancel'] },
          complete: { actions: ['restart'] },
        },
        routes: [
          commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
          commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
        ],
        onTrace: trace => traces.push(trace),
      },
    })

    const session = createChatSession(definition)
    expect(session.getConversationSnapshot()).toEqual({ state: 'idle', events: ['start'], actions: ['begin'] })
    const firstRequest = request('/start')
    expect(await read(session.chat.adapter.createSource(firstRequest))).toEqual([
      { type: 'text', content: 'What is your name?' }, { type: 'done' },
    ])
    expect(session.getConversationSnapshot()).toEqual({ state: 'collecting', events: ['finish'], actions: ['cancel'] })
    expect(await read(session.chat.adapter.createSource(request('/name Ada', 'user-2', firstRequest.messages)))).toEqual([
      { type: 'text', content: 'Welcome, Ada.' }, { type: 'done' },
    ])
    expect(session.getConversationSnapshot()).toEqual({ state: 'complete', events: [], actions: ['restart'] })
    expect(agentCalls).toBe(0)
    expect(traces.map(trace => trace.kind)).toEqual(['deterministic', 'deterministic'])
  })

  it('delegates unknown and state-disallowed input unchanged to the upstream adapter', async () => {
    const requests: AdapterRequest[] = []
    const traces: TurnTrace[] = []
    const upstream: AdapterFactory = { createSource: value => { requests.push(value); return adapter.createSource(value) } }
    const definition = defineChat({
      id: 'fallback', chat: { adapter: upstream },
      conversation: {
        initial: 'idle', states: { idle: { on: {} } },
        routes: [commandRoute({ id: 'blocked', command: '/start', event: 'start', response: () => 'blocked' })],
        onTrace: trace => traces.push(trace),
      },
    })
    const session = createChatSession(definition)
    const original = request('/start')
    await read(session.chat.adapter.createSource(original))
    expect(requests).toEqual([original])
    expect(traces).toEqual([{ kind: 'agentic', fromState: 'idle', toState: 'idle' }])
  })

  it('preserves route precedence and isolates session state', async () => {
    const definition = defineChat({
      id: 'precedence', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [
          { id: 'first', event: 'go', match: () => true, response: () => 'first' },
          { id: 'second', event: 'go', match: () => true, response: () => 'second' },
        ],
      },
    })
    const first = createChatSession(definition)
    const second = createChatSession(definition)
    expect(await read(first.chat.adapter.createSource(request('go')))).toContainEqual({ type: 'text', content: 'first' })
    expect(first.getConversationSnapshot()?.state).toBe('b')
    expect(second.getConversationSnapshot()?.state).toBe('a')
  })

  it.each(['repaired', 'fallback'] as const)('distinguishes %s route traces', async (traceKind) => {
    const traces: TurnTrace[] = []
    const session = createChatSession(defineChat({
      id: traceKind, chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: traceKind, event: 'go', traceKind, match: () => true, response: () => traceKind }],
        onTrace: trace => traces.push(trace),
      },
    }))
    await read(session.chat.adapter.createSource(request('go')))
    expect(traces[0]?.kind).toBe(traceKind)
  })

  it('returns a controller-owned error stream without committing when a route callback fails', async () => {
    const session = createChatSession(defineChat({
      id: 'failure', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: 'fail', event: 'go', match: () => true, response: () => { throw new Error('failed') } }],
      },
    }))
    expect(await read(session.chat.adapter.createSource(request('go')))).toEqual([
      { type: 'error', content: 'Deterministic route failed.' },
    ])
    expect(session.getConversationSnapshot()?.state).toBe('a')
  })

  it('keeps deterministic retry and regenerate off the model adapter', async () => {
    let agentCalls = 0
    const definition = defineChat({
      id: 'replay',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} },
        routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })],
      },
    })
    const session = createChatSession(definition)
    const controller = createChatController(session.chat)
    await controller.send('/start')
    await controller.retry()
    await controller.regenerate()
    expect(controller.getState().messages.at(-1)?.content).toBe('Started')
    expect(session.getConversationSnapshot()?.state).toBe('complete')
    expect(agentCalls).toBe(0)
  })

  it('recomputes state when a deterministic user turn is edited', async () => {
    let agentCalls = 0
    const definition = defineChat({
      id: 'edit',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} },
        routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })],
      },
    })
    const session = createChatSession(definition)
    const controller = createChatController(session.chat)
    await controller.send('/start')
    const userId = controller.getState().messages.find(message => message.role === 'user')!.id
    await controller.edit(userId, 'changed')
    expect(agentCalls).toBe(1)
    expect(session.getConversationSnapshot()?.state).toBe('idle')
  })

  it('drops cached decisions for turns removed from upstream history', async () => {
    let secondRuns = 0
    const session = createChatSession(defineChat({
      id: 'truncate', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { one: 'b' } }, b: { on: { two: 'c' } }, c: {} },
        routes: [
          commandRoute({ id: 'one', command: '/one', event: 'one', response: () => 'one' }),
          commandRoute({ id: 'two', command: '/two', event: 'two', response: () => `two-${++secondRuns}` }),
        ],
      },
    }))
    const first = request('/one', 'user-1')
    await read(session.chat.adapter.createSource(first))
    await read(session.chat.adapter.createSource(request('/two', 'user-2', first.messages)))

    await read(session.chat.adapter.createSource(request('edited', 'user-1')))
    const restarted = request('/one', 'user-3')
    await read(session.chat.adapter.createSource(restarted))
    const replayedId = await read(session.chat.adapter.createSource(request('/two', 'user-2', restarted.messages)))
    expect(replayedId).toContainEqual({ type: 'text', content: 'two-2' })
  })

  it('updates from a compiled config without recursive adapter wrapping', async () => {
    let agentCalls = 0
    const traces: TurnTrace[] = []
    const session = createChatSession(defineChat({
      id: 'compiled-update',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: {} }, routes: [],
        onTrace: trace => traces.push(trace),
      },
    }))
    const updated = session.updateChat({ ...session.chat, systemPrompt: 'updated' })
    await read(updated.adapter.createSource(request('unknown')))
    expect(agentCalls).toBe(1)
    expect(traces).toHaveLength(1)
  })

  it('isolates throwing sync and async trace sinks from dispatch', async () => {
    for (const onTrace of [
      () => { throw new Error('sync') },
      () => Promise.reject(new Error('async')),
    ]) {
      const session = createChatSession(defineChat({
        id: 'trace-failure', chat: { adapter },
        conversation: {
          initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
          routes: [{ id: 'go', event: 'go', match: () => true, response: () => 'ok' }],
          onTrace,
        },
      }))
      expect(await read(session.chat.adapter.createSource(request('go')))).toContainEqual({ type: 'text', content: 'ok' })
      expect(session.getConversationSnapshot()?.state).toBe('b')
    }
  })

  it('turns a throwing matcher into an error stream without model dispatch', async () => {
    let agentCalls = 0
    const session = createChatSession(defineChat({
      id: 'match-failure', chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: 'go', event: 'go', match: () => { throw new Error('failed') }, response: () => 'never' }],
      },
    }))
    expect(await read(session.chat.adapter.createSource(request('go')))).toEqual([
      { type: 'error', content: 'Deterministic route failed.' },
    ])
    expect(agentCalls).toBe(0)
    expect(session.getConversationSnapshot()?.state).toBe('a')
  })

  it.each([
    { initial: 'missing', states: { idle: {} }, routes: [] },
    { initial: '', states: { '': {} }, routes: [] },
    { initial: 'idle', states: { idle: { on: { go: 'missing' } } }, routes: [] },
    { initial: 'idle', states: { idle: {} }, routes: [{ id: '', event: 'go', match: () => true, response: () => '' }] },
    { initial: 'idle', states: { idle: {} }, routes: [
      { id: 'same', event: 'go', match: () => true, response: () => '' },
      { id: 'same', event: 'go', match: () => true, response: () => '' },
    ] },
    { initial: 'idle', states: { idle: {} }, routes: [
      { id: 'route', event: 'go', states: ['missing'], match: () => true, response: () => '' },
    ] },
  ])('rejects an invalid machine before dispatch', (conversation) => {
    expect(() => createChatSession(defineChat({ id: 'invalid', chat: { adapter }, conversation }))).toThrow(ConfigError)
  })

  it('rejects an empty exact command', () => {
    expect(() => commandRoute({ id: 'empty', command: '', event: 'go', response: () => '' })).toThrow(ConfigError)
  })
})
