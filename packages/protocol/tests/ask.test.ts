import { describe, expect, it } from 'vitest'

import { ASK_EVENT_MAX_BYTES, ASK_EVENT_MAX_RECORDS, ASK_SERVICE_PROTOCOL_VERSION, decodeAskEvents } from '../src/index.js'

describe('Ask service protocol v1', () => {
  it('decodes only complete, valid and bounded records', () => {
    const decoded = decodeAskEvents([
      JSON.stringify({ type: 'text', delta: 'hello' }),
      '{bad}',
      JSON.stringify({ type: 'future', value: true }),
      JSON.stringify({ type: 'done', model: 'test' }),
      '{"type":"text"',
    ].join('\n'))
    expect(ASK_SERVICE_PROTOCOL_VERSION).toBe(1)
    expect(decoded.events).toEqual([{ type: 'text', delta: 'hello' }, { type: 'done', model: 'test' }])
    expect(decoded.rest).toBe('{"type":"text"')
    expect(decoded.discardedPartial).toBe(false)
    expect(decodeAskEvents('x'.repeat(ASK_EVENT_MAX_BYTES + 1))).toEqual({ events: [], rest: '', discardedPartial: true })
    const many = `${JSON.stringify({ type: 'done' })}\n`.repeat(100_000)
    expect(many.length).toBeGreaterThan(ASK_EVENT_MAX_BYTES)
    expect(decodeAskEvents(many).events).toHaveLength(ASK_EVENT_MAX_RECORDS)
  })

  it('keeps unknown, malformed and invalid records inert', () => {
    expect(decodeAskEvents([
      JSON.stringify({ type: 'text', delta: 'ok', extra: true }),
      JSON.stringify({ type: 'tool', id: 'id', name: 'cite', args: [] }),
      JSON.stringify({ type: 'error', message: '' }),
      '',
    ].join('\n')).events).toEqual([])
  })
})
