import { decodeAskEvents, type AskEvent } from '@agentskit/chat-protocol'

const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000

export interface TurnClientOptions {
  /** Turn service URL, or a same-origin relative path. Required: there is no hosted default. */
  readonly endpoint: string
  /** Application session ID. The server keeps the history under it, so each turn carries only the new message. */
  readonly sessionId?: string
  readonly corpus?: string
  readonly persona?: string
  readonly fetch?: typeof fetch
  /** Covers connection establishment only; the stream then runs until done, error or abort. */
  readonly connectionTimeoutMs?: number
}

export interface TurnSendOptions {
  readonly signal?: AbortSignal
}

export interface TurnClient {
  /** Sends one user turn and yields each already-validated event; invalid records are dropped. Ends after `done` or `error`. */
  readonly send: (text: string, options?: TurnSendOptions) => AsyncIterableIterator<AskEvent>
}

const turnUrl = ({ endpoint, corpus, persona }: TurnClientOptions): string => {
  const relative = endpoint.startsWith('/')
  const origin = typeof globalThis.location === 'undefined' ? 'http://localhost' : globalThis.location.origin
  const url = new URL(endpoint, origin)
  if (corpus?.trim()) url.searchParams.set('corpus', corpus)
  if (persona?.trim()) url.searchParams.set('persona', persona)
  return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

/** Typed client for the v1 turn protocol: POSTs one turn and streams validated NDJSON events. */
export function createTurnClient(options: TurnClientOptions): TurnClient {
  if (typeof options?.endpoint !== 'string' || options.endpoint.trim() === '') {
    throw new Error('createTurnClient requires an "endpoint" (turn service URL or same-origin path); there is no default host.')
  }
  async function* send(text: string, sendOptions: TurnSendOptions = {}): AsyncIterableIterator<AskEvent> {
    const doFetch = options.fetch ?? globalThis.fetch
    const connection = new AbortController()
    const timeout = setTimeout(() => connection.abort(), options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS)
    const signals = sendOptions.signal === undefined ? [connection.signal] : [sendOptions.signal, connection.signal]
    let response: Response
    try {
      response = await doFetch(turnUrl(options), {
        method: 'POST',
        signal: AbortSignal.any(signals),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          protocol: 'agentskit.chat.ask',
          version: 1,
          ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
          messages: [{ role: 'user', content: text }],
        }),
      })
    } finally {
      clearTimeout(timeout)
    }
    if (!response.ok || response.body === null) throw new Error(`Turn request failed (${response.status}).`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let discarding = false
    try {
      while (true) {
        const result = await reader.read()
        let incoming = decoder.decode(result.value, { stream: !result.done })
        if (discarding) {
          const lineEnd = incoming.indexOf('\n')
          if (lineEnd < 0) {
            if (result.done) return
            continue
          }
          incoming = incoming.slice(lineEnd + 1)
          discarding = false
        }
        buffer += incoming
        const decoded = decodeAskEvents(result.done ? `${buffer}\n` : buffer)
        buffer = decoded.rest
        discarding = decoded.discardedPartial
        for (const event of decoded.events) {
          yield event
          if (event.type === 'done' || event.type === 'error') return
        }
        if (result.done) return
      }
    } finally {
      void reader.cancel().catch(() => undefined)
    }
  }
  return { send }
}
