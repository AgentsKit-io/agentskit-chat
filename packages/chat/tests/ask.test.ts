import type { AdapterFactory, Message, StreamChunk } from '@agentskit/core'
import { decodeAssistantContent, type ComponentRenderFrame } from '@agentskit/chat-protocol'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createAskAdapter,
  createAskSessionMemory,
  decodeAskEvents,
  projectAskEvent,
  projectAskMessages,
  type AskToolProjector,
} from '../src/index.js'

const message = (role: 'user' | 'assistant', content: string, id = role): Message => ({
  id, role, content, status: 'complete', createdAt: new Date(0),
})

const read = async (source: ReturnType<AdapterFactory['createSource']>): Promise<StreamChunk[]> => {
  const chunks: StreamChunk[] = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  return chunks
}

const response = (chunks: readonly string[], status = 200): Response => new Response(new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder()
    for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
    controller.close()
  },
}), { status })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Ask event boundary', () => {
  it('decodes only complete, valid and bounded records', () => {
    const decoded = decodeAskEvents([
      JSON.stringify({ type: 'text', delta: 'hello' }),
      '{bad}',
      JSON.stringify({ type: 'future', value: true }),
      JSON.stringify({ type: 'done', model: 'test' }),
      '{"type":"text"',
    ].join('\n'))
    expect(decoded.events).toEqual([{ type: 'text', delta: 'hello' }, { type: 'done', model: 'test' }])
    expect(decoded.rest).toBe('{"type":"text"')
    expect(decodeAskEvents('x'.repeat(1_048_577))).toEqual({ events: [], rest: '' })
  })

  it('projects ordered text and safe source-list frames', () => {
    expect(projectAskEvent({ type: 'text', delta: 'Answer' })).toEqual({ kind: 'text', text: 'Answer' })
    expect(projectAskEvent({ type: 'tool', id: 'cite/1', name: 'cite', args: { sources: [
      { title: 'Guide', path: '/docs/guide', anchor: 'first step' },
      { title: 'External', path: 'https://example.com/docs' },
      { title: 'Protocol relative', path: '//evil.example' },
      { title: 'Script', path: 'javascript:alert(1)' },
      { title: '', path: '/empty' },
      { title: 'Too long', path: `/${'x'.repeat(2_048)}` },
    ] } })).toEqual({
      kind: 'component',
      frame: expect.objectContaining({
        componentKey: 'source-list',
        instanceId: 'cite-1',
        props: { label: 'Sources', sources: [
          { id: 'source-1', title: 'Guide', url: '/docs/guide#first%20step' },
          { id: 'source-2', title: 'External', url: 'https://example.com/docs' },
        ] },
      }),
    })
  })

  it('accepts only runtime-valid custom tool frames', () => {
    const frame: ComponentRenderFrame = {
      protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'ask-tool', instanceId: 'tool-1',
      props: { name: 'codeBlock' }, fallback: { kind: 'ask-tool', summary: 'Code example.' },
    }
    const event = { type: 'tool' as const, id: 'tool-1', name: 'codeBlock', args: {} }
    expect(projectAskEvent(event, () => frame)).toEqual({ kind: 'component', frame })
    expect(projectAskEvent(event, () => ({ ...frame, componentKey: 'Invalid Key' } as never))).toBeUndefined()
    expect(projectAskEvent(event, () => { throw new Error('host projector failed') })).toBeUndefined()
    expect(projectAskEvent(event)).toBeUndefined()
  })
})

describe('Ask adapter', () => {
  it('sends projected history and streams NDJSON as ordered canonical content', async () => {
    const fetchMock = vi.fn(async () => response([
      '{"type":"text","delta":"Hello "}\n{"type":"tool","id":"cite","name":"cite","args":{"sources":[{"title":"Docs","path":"/docs"}]}}\n',
      '{bad}\n{"type":"done","model":"test"}\n',
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const source = createAskAdapter({ endpoint: '/api/ask', corpus: 'registry', persona: 'guide' }).createSource({
      messages: [message('user', 'Question')],
    })

    const chunks = await read(source)
    expect(fetchMock).toHaveBeenCalledWith('/api/ask?corpus=registry&persona=guide', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'Question' }] }),
    }))
    expect(chunks.at(-1)).toEqual({ type: 'done' })
    const content = chunks.filter(chunk => chunk.type === 'text').map(chunk => chunk.content).join('')
    expect(decodeAssistantContent(content)).toEqual({
      ok: true,
      complete: true,
      parts: [
        { kind: 'text', text: 'Hello ' },
        { kind: 'component', frame: expect.objectContaining({ componentKey: 'source-list' }) },
      ],
    })
  })

  it('supports plain-text fallback and chunks long text safely', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([`plain ${'x'.repeat(20_000)}`])))
    const chunks = await read(createAskAdapter({ corpus: 'docs' }).createSource({ messages: [message('user', 'Q')] }))
    const content = chunks.filter(chunk => chunk.type === 'text').map(chunk => chunk.content).join('')
    const decoded = decodeAssistantContent(content)
    expect(decoded.ok && decoded.parts.filter(part => part.kind === 'text').map(part => part.text).join('')).toHaveLength(20_006)
    expect(chunks.at(-1)).toEqual({ type: 'done' })
  })

  it('clears the connection deadline after headers while a healthy stream continues', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode('{"type":"text","delta":"late"}\n{"type":"done"}\n'))
          controller.close()
        }, 35_000)
      },
    }))))
    const reading = read(createAskAdapter().createSource({ messages: [message('user', 'Q')] }))
    await vi.advanceTimersByTimeAsync(35_000)
    await expect(reading).resolves.toEqual([
      expect.objectContaining({ type: 'text' }),
      { type: 'done' },
    ])
  })

  it('aborts a pending connection without emitting an error', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })))
    const source = createAskAdapter().createSource({ messages: [message('user', 'Q')] })
    const reading = read(source)
    source.abort()
    await expect(reading).resolves.toEqual([])
  })

  it('reports HTTP and bounded-response failures as error chunks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(['failure'], 503)))
    await expect(read(createAskAdapter().createSource({ messages: [] }))).resolves.toEqual([
      { type: 'error', content: 'Ask request failed (503).' },
    ])
    vi.stubGlobal('fetch', vi.fn(async () => response(['x'.repeat(1_048_577)])))
    await expect(read(createAskAdapter().createSource({ messages: [] }))).resolves.toEqual([
      { type: 'error', content: 'Ask response exceeded its safety limit.' },
    ])
  })

  it('projects ordered assistant content back to the Ask wire format', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(['done'])))
    const projector: AskToolProjector = event => ({
      protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'ask-tool', instanceId: event.id,
      props: event.args, fallback: { kind: 'ask-tool', summary: 'Tool.' },
    })
    const tool = projectAskEvent({ type: 'tool', id: 'tool', name: 'custom', args: {} }, projector)
    expect(tool?.kind).toBe('component')
    if (tool?.kind !== 'component') return
    const { createAssistantContentEncoder } = await import('@agentskit/chat-protocol')
    const encoder = createAssistantContentEncoder()
    const content = encoder.encode({ kind: 'text', text: 'answer' }) + encoder.encode({ kind: 'component', frame: tool.frame })
    expect(projectAskMessages([message('assistant', content), { ...message('user', 'ignored'), role: 'system' }])).toEqual([
      { role: 'assistant', content: 'answer\n[ask-tool]' },
    ])
  })
})

class MemoryStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('Ask session memory', () => {
  it('migrates Registry, Playbook and rich Docs records through Web Storage memory', async () => {
    const storage = new MemoryStorage()
    storage.values.set('legacy', JSON.stringify([
      { id: 'u/1', role: 'user', text: 'Question' },
      { role: 'assistant', parts: [
        { kind: 'text', text: 'Answer' },
        { kind: 'text', text: 'x'.repeat(20_000) },
        { kind: 'tool', id: 'cite', name: 'cite', args: { sources: [{ title: 'Docs', path: '/docs' }] } },
      ] },
      { role: 'user', content: 'Again' },
      { role: 'assistant', content: 'Done' },
    ]))
    const memory = createAskSessionMemory({ key: 'canonical-v2', legacyKeys: ['legacy'], getStorage: () => storage })
    const loaded = await memory.load()
    expect(loaded).toHaveLength(4)
    expect(loaded[0]).toMatchObject({ id: 'u-1', role: 'user', content: 'Question' })
    expect(decodeAssistantContent(loaded[1]!.content)).toEqual({
      ok: true, complete: true, parts: [
        { kind: 'text', text: 'Answer' },
        { kind: 'text', text: 'x'.repeat(16_384) },
        { kind: 'text', text: 'x'.repeat(3_616) },
        { kind: 'component', frame: expect.objectContaining({ componentKey: 'source-list' }) },
      ],
    })
    expect(storage.getItem('canonical-v2')).not.toBeNull()
    expect(storage.getItem('legacy')).toBeNull()
  })

  it('keeps valid legacy data readable when canonical storage is read-only', async () => {
    const storage = new MemoryStorage()
    storage.values.set('legacy', JSON.stringify([{ role: 'user', text: 'Preserve me' }]))
    storage.setItem = () => { throw new Error('quota') }
    const memory = createAskSessionMemory({ key: 'canonical', legacyKeys: ['legacy'], getStorage: () => storage })
    await expect(memory.load()).resolves.toEqual([expect.objectContaining({ content: 'Preserve me' })])
    expect(storage.getItem('legacy')).not.toBeNull()
  })

  it('rejects corrupt canonical records and is SSR-safe without storage', async () => {
    const storage = new MemoryStorage()
    storage.values.set('canonical', '{bad}')
    const memory = createAskSessionMemory({ key: 'canonical', getStorage: () => storage })
    await expect(memory.load()).resolves.toEqual([])
    expect(storage.getItem('canonical')).toBeNull()
    await expect(createAskSessionMemory({ key: 'ssr', getStorage: () => undefined }).load()).resolves.toEqual([])
  })
})
