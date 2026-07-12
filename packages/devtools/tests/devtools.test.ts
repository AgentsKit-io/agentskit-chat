import { createRecordingAdapter, createReplayAdapter, createCassette } from '@agentskit/eval/replay'
import { buildMessage, type AdapterFactory, type AdapterRequest } from '@agentskit/core'
import { describe, expect, it } from 'vitest'
import { captureActionPolicyTrace, captureTurnTrace, compareRendererOutcomes, createReplayFixture, createTraceCapture, parseReplayFixture, serializeReplayFixture } from '../src/index.js'

const request: AdapterRequest = { messages: [buildMessage({ role: 'user', content: 'hello' })] }
const read = async (adapter: AdapterFactory): Promise<readonly unknown[]> => { const chunks = []; for await (const chunk of adapter.createSource(request).stream()) chunks.push(chunk); return chunks }

describe('application trace capture', () => {
  it('redacts configured fields recursively without mutating input and preserves causal order', () => {
    const capture = createTraceCapture({ redactFields: ['token', 'password'], now: () => new Date(0) })
    const detail = { routeId: 'support', nested: { token: 'secret' }, list: [{ password: 'hidden' }] }
    const route = capture.append({ category: 'route', detail })
    capture.append({ category: 'action', parentId: route.id, detail: { action: 'open-ticket' } })
    expect(capture.snapshot()).toEqual([
      expect.objectContaining({ id: 'trace-0', sequence: 0, detail: { routeId: 'support', nested: { token: '[REDACTED]' }, list: [{ password: '[REDACTED]' }] } }),
      expect.objectContaining({ id: 'trace-1', sequence: 1, parentId: 'trace-0' }),
    ])
    expect(detail.nested.token).toBe('secret')
    expect(() => capture.append({ category: 'policy', parentId: 'future', detail: {} })).toThrow('earlier')
  })

  it('isolates snapshots and validates trace boundaries', () => {
    const capture = createTraceCapture({ now: () => new Date(0) })
    capture.append({ category: 'lifecycle', detail: { status: 'complete' } })
    const snapshot = capture.snapshot()
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot[0]?.detail)).toBe(true)
    expect(Object.isFrozen(snapshot[0]?.detail.status)).toBe(true)
    expect(() => capture.append({ category: 'route', detail: { huge: 'x'.repeat(70_000) } })).toThrow()
  })

  it('projects route, repair, fallback, agent, and policy traces from chat contracts', () => {
    const capture = createTraceCapture({ now: () => new Date(0) })
    const route = captureTurnTrace(capture, { kind: 'deterministic', routeId: 'support', fromState: 'idle', toState: 'open' })
    captureTurnTrace(capture, { kind: 'repaired', routeId: 'repair', fromState: 'open', toState: 'open' }, route.id)
    captureTurnTrace(capture, { kind: 'fallback', routeId: 'fallback', fromState: 'open', toState: 'open' })
    captureTurnTrace(capture, { kind: 'agentic', fromState: 'open', toState: 'open' })
    captureActionPolicyTrace(capture, { id: 'policy-1', toolCallId: 'tool-1', action: 'open-ticket', phase: 'propose', decision: 'allow', reason: 'allowed', requiredCapabilities: ['ticket.write'], timestamp: 0 }, route.id)
    expect(capture.snapshot().map(trace => trace.category)).toEqual(['route', 'repair', 'fallback', 'agent', 'policy'])
  })
})

describe('replay fixture', () => {
  it('captures application traces beside an upstream cassette and replays it', async () => {
    const live: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'text', content: 'recorded' } as const; yield { type: 'done' } as const }, abort() {} }) }
    const recording = createRecordingAdapter(live)
    await read(recording.factory)
    const capture = createTraceCapture({ now: () => new Date(0) })
    capture.append({ category: 'agent', detail: { fromState: 'idle', toState: 'idle' } })
    const fixture = parseReplayFixture(serializeReplayFixture(createReplayFixture(recording.cassette, capture.snapshot())))
    expect(fixture.traces).toHaveLength(1)
    expect(await read(createReplayAdapter(fixture.cassette))).toEqual([{ type: 'text', content: 'recorded' }, { type: 'done' }])
  })

  it('rejects malformed fixture and cassette versions', () => {
    expect(() => parseReplayFixture('{"protocol":"agentskit.chat.replay","version":2}')).toThrow()
    expect(() => createReplayFixture({ ...createCassette(), version: 2 as 1 }, [])).toThrow('Unsupported cassette')
    expect(() => createReplayFixture(createCassette(), [{ id: 'late', sequence: 1, at: new Date(0).toISOString(), category: 'route', parentId: 'missing', detail: {} }])).toThrow()
  })
})

describe('renderer semantic parity', () => {
  it('accepts equivalent outcomes regardless of object key order', () => {
    const report = compareRendererOutcomes([
      { renderer: 'react', outcomes: [{ turnId: 'one', kind: 'component', value: { a: 1, b: 2 } }] },
      { renderer: 'ink', outcomes: [{ turnId: 'one', kind: 'component', value: { b: 2, a: 1 } }] },
    ])
    expect(report.ok).toBe(true)
  })

  it('reports intentional missing and different outcomes stably', () => {
    const report = compareRendererOutcomes([
      { renderer: 'react', outcomes: [{ turnId: 'one', kind: 'text', value: 'ok' }, { turnId: 'two', kind: 'action' }] },
      { renderer: 'vue', outcomes: [{ turnId: 'one', kind: 'text', value: 'different' }, { turnId: 'three', kind: 'fallback' }] },
    ])
    expect(report.ok).toBe(false)
    expect(report.mismatches.map(item => [item.renderer, item.turnId])).toEqual([['vue', 'one'], ['vue', 'two'], ['vue', 'three']])
    expect(() => compareRendererOutcomes([{ renderer: 'react', outcomes: [] }])).toThrow()
  })
})
