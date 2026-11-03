import type { Message, StreamChunk } from '@agentskit/core'
import { describe, expect, it, vi } from 'vitest'

import { createTurnAdapter, createTurnClient, type AskEvent } from '../src/index.js'

const body = (chunks: readonly string[]): Response => new Response(new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder()
    for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
    controller.close()
  },
}), { status: 200, headers: { 'content-type': 'application/x-ndjson' } })

const collect = async (iterable: AsyncIterable<AskEvent>): Promise<AskEvent[]> => {
  const events: AskEvent[] = []
  for await (const event of iterable) events.push(event)
  return events
}

const lines = (...events: unknown[]): string => events.map(event => `${JSON.stringify(event)}\n`).join('')

describe('turn client', () => {
  it('sends only the new turn and yields every event type, validated', async () => {
    const fetchMock = vi.fn(async () => body([
      lines({ type: 'text', delta: 'Hel' }, { type: 'text', delta: 'lo' }).slice(0, 20),
      lines({ type: 'text', delta: 'Hel' }, { type: 'text', delta: 'lo' }).slice(20),
      lines(
        { type: 'tool', id: 't1', name: 'cite', args: { sources: [] } },
        { type: 'bogus' },
        { type: 'text', delta: 5 },
        { type: 'done', model: 'm' },
        { type: 'text', delta: 'after done' },
      ),
    ]))
    const client = createTurnClient({ endpoint: '/api/turn', sessionId: 's1', corpus: 'docs', fetch: fetchMock as unknown as typeof fetch })
    const events = await collect(client.send('hi'))
    expect(events).toEqual([
      { type: 'text', delta: 'Hel' },
      { type: 'text', delta: 'lo' },
      { type: 'tool', id: 't1', name: 'cite', args: { sources: [] } },
      { type: 'done', model: 'm' },
    ])
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/turn?corpus=docs')
    expect(JSON.parse(init.body as string)).toEqual({
      protocol: 'agentskit.chat.ask', version: 1, sessionId: 's1', messages: [{ role: 'user', content: 'hi' }],
    })
  })

  it('yields error events and stops', async () => {
    const fetchMock = vi.fn(async () => body([lines({ type: 'error', message: 'nope', code: 'ASK_RATE_LIMITED', retryable: true }, { type: 'done' })]))
    const events = await collect(createTurnClient({ endpoint: '/t', fetch: fetchMock as unknown as typeof fetch }).send('x'))
    expect(events).toEqual([{ type: 'error', message: 'nope', code: 'ASK_RATE_LIMITED', retryable: true }])
  })

  it('drops invalid events and rejects failed responses', async () => {
    const ok = vi.fn(async () => body(['not json\n{"type":"done","extra":1}\n{"type":"done"}']))
    expect(await collect(createTurnClient({ endpoint: '/t', fetch: ok as unknown as typeof fetch }).send('x'))).toEqual([{ type: 'done' }])
    const bad = vi.fn(async () => new Response('x', { status: 500 }))
    await expect(collect(createTurnClient({ endpoint: '/t', fetch: bad as unknown as typeof fetch }).send('x'))).rejects.toThrow('Turn request failed (500).')
    expect(() => createTurnClient({ endpoint: ' ' })).toThrow('endpoint')
  })
})

describe('turn adapter', () => {
  it('sends only the latest user message when the server owns history', async () => {
    const fetchMock = vi.fn(async () => body([lines({ type: 'text', delta: 'ok' }, { type: 'done' })]))
    vi.stubGlobal('fetch', fetchMock)
    const adapter = createTurnAdapter({ endpoint: '/api/turn' })
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'first', status: 'complete', createdAt: new Date(0) },
      { id: '2', role: 'assistant', content: 'answer', status: 'complete', createdAt: new Date(0) },
      { id: '3', role: 'user', content: 'second', status: 'complete', createdAt: new Date(0) },
    ]
    const chunks: StreamChunk[] = []
    for await (const chunk of adapter.createSourceForSession({ messages }, 's1').stream()) chunks.push(chunk)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).messages).toEqual([{ role: 'user', content: 'second' }])
    expect(chunks.at(-1)).toEqual({ type: 'done' })
    vi.unstubAllGlobals()
  })
})
