import { createInMemoryMemory } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import type { SessionSnapshot } from '@agentskit/chat-protocol'
import { decodeTurnEvent } from '@agentskit/chat-protocol'
import { createServer } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createChatHandler } from '../src/index.js'

const decoder = new TextDecoder()

const submission = (sessionId = 'session') => ({
  protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit-1', sessionId, turnId: 'turn-1', sequence: 0,
  emittedAt: '2026-07-11T00:00:00.000Z', event: 'client.turn.submit', payload: { input: 'hello' },
})

const request = (body: unknown, headers: Record<string, string> = {}): Request => new Request('http://localhost/chat', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
})

const createStorage = (): import('@agentskit/chat').SessionStorage => {
  let stored: SessionSnapshot | undefined
  return {
    load: () => stored,
    save: (snapshot, expected) => {
      if (stored?.cursor !== expected) return false
      stored = structuredClone(snapshot)
      return true
    },
  }
}

const adapter = (onAbort?: () => void): AdapterFactory => ({
  createSource: value => {
    let aborted = false
    return {
      async *stream() {
        if (onAbort) await new Promise<void>(resolve => {
          const poll = (): void => aborted ? resolve() : setTimeout(poll, 1)
          poll()
        })
        if (aborted) return
        yield { type: 'text', content: `Echo: ${value.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''}` }
        yield { type: 'done' }
      },
      abort() { aborted = true; onAbort?.() },
    }
  },
})

const lines = async (response: Response): Promise<ReturnType<typeof decodeTurnEvent>[]> =>
  (await response.text()).trim().split('\n').filter(Boolean).map(line => decodeTurnEvent(line))

describe('Web-standard chat handler', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rejects invalid request boundaries with safe typed diagnostics', async () => {
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter() } }), sessionStorage: () => createStorage(), maxBodyBytes: 20 })
    expect((await handler(new Request('http://localhost/chat'))).status).toBe(405)
    expect((await handler(new Request('http://localhost/chat', { method: 'POST', body: '{}' }))).status).toBe(415)
    expect((await handler(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status).toBe(400)
    const large = await handler(request({ value: 'x'.repeat(100) }))
    expect(large.status).toBe(413)
    expect(await large.json()).toEqual({ error: { version: 1, code: 'REQUEST_TOO_LARGE', message: 'Request body is too large.', retryable: false } })
  })

  it('cancels a chunked body as soon as the byte limit is exceeded', async () => {
    const cancelled = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(16)) },
      cancel: cancelled,
    })
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter() } }), sessionStorage: () => createStorage(), maxBodyBytes: 20 })
    const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit & { duplex: 'half' }
    expect((await handler(new Request('http://localhost/chat', init))).status).toBe(413)
    expect(cancelled).toHaveBeenCalledOnce()
  })

  it('resolves trusted context before parsing and ignores spoofed payload context', async () => {
    const order: string[] = []
    const handler = createChatHandler<{ tenantId: string }>({
      authenticate: async (_request, signal) => { order.push('auth'); expect(signal).toBeInstanceOf(AbortSignal); return { ok: true, context: { tenantId: 'trusted' } } },
      resolveDefinition: context => { order.push(`definition:${context?.tenantId}`); return { id: 'chat', chat: { adapter: adapter() } } },
      sessionStorage: () => createStorage(),
    })
    const response = await handler(request({ ...submission(), context: { tenantId: 'attacker' } }))
    expect(response.status).toBe(200)
    expect(order).toEqual(['auth', 'definition:trusted'])
    expect((await lines(response)).every(result => result.ok)).toBe(true)
  })

  it('streams monotonic snapshots and resumes upstream memory plus CAS session state', async () => {
    const memory = createInMemoryMemory()
    let stored: SessionSnapshot | undefined
    const storage = {
      load: () => stored,
      save: (snapshot: SessionSnapshot, expected: number | undefined) => {
        if (stored?.cursor !== expected) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    let id = 0
    const handler = createChatHandler({
      resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter(), memory } }),
      sessionStorage: () => storage,
      createId: () => `server-${++id}`,
    })
    const first = await lines(await handler(request(submission())))
    const firstEvents = first.flatMap(result => result.ok && result.event.event === 'server.turn.snapshot' ? [result.event] : [])
    expect(firstEvents.length).toBeGreaterThanOrEqual(1)
    expect(firstEvents.map(event => event.sequence)).toEqual([...firstEvents.map(event => event.sequence)].sort((a, b) => a - b))
    expect(firstEvents.at(-1)?.payload.messages.at(-1)?.content).toBe('Echo: hello')

    const second = await lines(await handler(request({ ...submission(), eventId: 'submit-2', turnId: 'turn-2', payload: { input: 'again' } })))
    const secondEvents = second.flatMap(result => result.ok && result.event.event === 'server.turn.snapshot' ? [result.event] : [])
    expect(secondEvents[0]!.sequence).toBeGreaterThan(firstEvents.at(-1)!.sequence)
    expect(secondEvents.at(-1)?.payload.messages.some(message => message.content === 'Echo: hello')).toBe(true)
  })

  it('turns a deadline into a typed snapshot and aborts the upstream source', async () => {
    const aborted = vi.fn()
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter(aborted) } }), sessionStorage: () => createStorage(), timeoutMs: 10, createId: () => 'timeout-event' })
    const events = await lines(await handler(request(submission())))
    expect(aborted).toHaveBeenCalledOnce()
    expect(events.some(result => result.ok && result.event.event === 'server.turn.diagnostic' && result.event.payload.code === 'SERVER_TIMEOUT')).toBe(true)
  })

  it('claims a session before starting work and rejects a concurrent turn', async () => {
    const storage = createStorage()
    const calls = vi.fn()
    const slow: AdapterFactory = { createSource: () => ({ async *stream() { calls(); await new Promise(resolve => setTimeout(resolve, 20)); yield { type: 'done' } }, abort() {} }) }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: slow } }), sessionStorage: () => storage })
    const first = await handler(request(submission()))
    const second = await handler(request({ ...submission(), eventId: 'submit-2' }))
    expect(second.status).toBe(409)
    await first.text()
    const replay = await handler(request({ ...submission(), eventId: 'submit-3' }))
    expect(replay.status).toBe(409)
    expect(calls).toHaveBeenCalledOnce()
  })

  it('cleans up on deadline even when the response remains unread under backpressure', async () => {
    const storage = createStorage()
    const saved = vi.fn()
    const aborted = vi.fn()
    const memory = { load: () => [], save: saved, clear: () => undefined }
    const slow: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'text', content: 'first' }; await new Promise(resolve => setTimeout(resolve, 100)); yield { type: 'done' } }, abort: aborted }) }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: slow, memory } }), sessionStorage: () => storage, timeoutMs: 10, cleanupTimeoutMs: 5 })
    await handler(request(submission()))
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(aborted).toHaveBeenCalledOnce()
    expect(saved).toHaveBeenCalledOnce()
    const next = await handler(request({ ...submission(), eventId: 'submit-2', turnId: 'turn-2' }))
    expect(next.status).toBe(200)
    await next.body?.cancel()
  })

  it('emits a safe diagnostic when persistence conflicts after headers', async () => {
    let saves = 0
    const storage: import('@agentskit/chat').SessionStorage = {
      load: () => undefined,
      save: () => { saves += 1; return saves === 1 },
    }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter() } }), sessionStorage: () => storage, createId: () => `conflict-${saves}` })
    const events = await lines(await handler(request(submission())))
    expect(events.some(result => result.ok && result.event.event === 'server.turn.diagnostic' && result.event.payload.code === 'SESSION_CONFLICT')).toBe(true)
  })

  it('records an indeterminate terminal turn when canonical memory cannot be saved', async () => {
    let stored: SessionSnapshot | undefined
    const storage: import('@agentskit/chat').SessionStorage = {
      load: () => stored,
      save: (snapshot, expected) => {
        if (stored?.cursor !== expected) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    const memory = { load: () => [], save: () => Promise.reject(new Error('private storage failure')), clear: () => undefined }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter(), memory } }), sessionStorage: () => storage })
    const events = await lines(await handler(request(submission())))
    expect(events.some(result => result.ok && result.event.event === 'server.turn.diagnostic' && result.event.payload.code === 'SERVER_INTERNAL')).toBe(true)
    expect(stored?.terminalTurns).toEqual([{ turnId: 'turn-1', outcome: 'indeterminate' }])
  })

  it('stops and durably cleans up when the response reader cancels', async () => {
    const aborted = vi.fn()
    const storage = createStorage()
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: adapter(aborted), memory: createInMemoryMemory() } }), sessionStorage: () => storage })
    const response = await handler(request(submission()))
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    expect(aborted).toHaveBeenCalledOnce()
    const resumed = await handler(request({ ...submission(), eventId: 'submit-2', turnId: 'turn-2' }))
    expect(resumed.status).toBe(200)
    await resumed.body?.cancel()
  })

  it('works behind a real Node HTTP bridge with fetch streaming', async () => {
    let finished = false
    const aborted = vi.fn()
    const storage = createStorage()
    const streaming: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'text', content: 'first' }; await new Promise(resolve => setTimeout(resolve, 30)); finished = true; yield { type: 'done' } }, abort: aborted }) }
    const handler = createChatHandler({ resolveDefinition: () => ({ id: 'chat', chat: { adapter: streaming } }), sessionStorage: () => storage, createId: () => 'http-event' })
    const server = createServer(async (incoming, outgoing) => {
      const disconnected = new AbortController()
      const abort = (): void => { if (!outgoing.writableEnded) disconnected.abort() }
      incoming.once('aborted', abort)
      outgoing.once('close', abort)
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const response = await handler(new Request(`http://127.0.0.1${incoming.url ?? '/'}`, {
        method: incoming.method, headers: incoming.headers as HeadersInit,
        signal: disconnected.signal,
        ...(chunks.length > 0 ? { body: Buffer.concat(chunks) } : {}),
      }))
      outgoing.writeHead(response.status, Object.fromEntries(response.headers))
      if (!response.body) return outgoing.end()
      const reader = response.body.getReader()
      try {
        while (true) {
          const result = await reader.read()
          if (result.done) break
          outgoing.write(result.value)
        }
        outgoing.end()
      } catch (error) {
        if (!disconnected.signal.aborted) throw error
      } finally {
        if (disconnected.signal.aborted) await reader.cancel().catch(() => undefined)
        incoming.removeListener('aborted', abort)
        outgoing.removeListener('close', abort)
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('server address unavailable')
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(submission()) })
      expect(response.status).toBe(200)
      const reader = response.body!.getReader()
      const first = await reader.read()
      expect(first.done).toBe(false)
      expect(finished).toBe(false)
      let text = decoder.decode(first.value)
      while (true) {
        const part = await reader.read()
        if (part.done) break
        text += decoder.decode(part.value)
      }
      expect(text.trim().split('\n').some(line => decodeTurnEvent(line).ok)).toBe(true)

      finished = false
      const cancellation = new AbortController()
      const cancelled = await fetch(`http://127.0.0.1:${address.port}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...submission(), eventId: 'submit-2', turnId: 'turn-2' }), signal: cancellation.signal })
      await cancelled.body!.getReader().read()
      cancellation.abort()
      await new Promise(resolve => setTimeout(resolve, 60))
      expect(aborted).toHaveBeenCalledOnce()
      const resumed = await fetch(`http://127.0.0.1:${address.port}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...submission(), eventId: 'submit-3', turnId: 'turn-3' }) })
      expect(resumed.status).toBe(200)
      await resumed.body?.cancel()
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
