import type { AdapterFactory, AdapterRequest, ChatMemory, Message, StreamChunk, StreamSource } from '@agentskit/core'
import { createWebStorageMemory, type WebStorageLike } from '@agentskit/memory/web-storage'
import {
  ASK_EVENT_MAX_BYTES,
  AnswerResponseSchema,
  ASSISTANT_CONTENT_MAX_BYTES,
  ASSISTANT_CONTENT_MAX_RECORDS,
  AskEventSchema,
  ComponentRenderFrameSchema,
  createAssistantContentEncoder,
  decodeAskEvents,
  decodeAssistantContent,
  type AssistantContentPart,
  type AskEvent,
  type AskToolEvent,
  type ComponentRenderFrame,
} from '@agentskit/chat-protocol'

const MAX_TEXT_CHARS = 16_384
const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000
const DEFAULT_ENDPOINT = 'https://ask.agentskit.io/v1/ask'

export type AskToolProjector = (event: AskToolEvent) => ComponentRenderFrame | undefined

export type AskProjection =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'component'; readonly frame: ComponentRenderFrame }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'done' }

export interface AskAdapterOptions {
  readonly endpoint?: string
  readonly corpus?: string
  readonly persona?: string
  readonly projectTool?: AskToolProjector
}

export interface AskMemoryOptions {
  readonly key: string
  readonly legacyKeys?: readonly string[]
  readonly maxMessages?: number
  readonly maxRecordBytes?: number
  readonly getStorage?: () => WebStorageLike | undefined
  readonly projectTool?: AskToolProjector
}

export interface AskAdapter extends AdapterFactory {
  readonly createSourceForSession: (request: AdapterRequest, sessionId: string) => StreamSource
}

export { AskEventSchema, decodeAskEvents, type AskEvent, type AskToolEvent } from '@agentskit/chat-protocol'

const safeId = (value: string, fallback: string): string => {
  const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : fallback
}

const safeHref = (path: string, anchor?: string): string | undefined => {
  const fragment = anchor?.replace(/^#/, '')
  const hasScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)
  if (!hasScheme && !path.startsWith('//')) {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, 'https://agentskit.invalid')
    if (url.origin !== 'https://agentskit.invalid') return undefined
    if (fragment !== undefined) url.hash = fragment
    const href = `${url.pathname}${url.search}${url.hash}`
    return href.length <= 2_048 ? href : undefined
  }
  try {
    const url = new URL(path)
    if (!['http:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== '') return undefined
    if (fragment !== undefined) url.hash = fragment
    const href = url.toString()
    return href.length <= 2_048 ? href : undefined
  } catch {
    return undefined
  }
}

const sourceListFrame = (event: AskToolEvent): ComponentRenderFrame | undefined => {
  if (!Array.isArray(event.args.sources)) return undefined
  const sources = event.args.sources.flatMap((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return []
    const source = candidate as Record<string, unknown>
    if (typeof source.title !== 'string' || source.title.trim() === '' || typeof source.path !== 'string') return []
    const url = safeHref(source.path, typeof source.anchor === 'string' ? source.anchor : undefined)
    return url === undefined ? [] : [{ id: `source-${index + 1}`, title: source.title.slice(0, 256), url }]
  }).slice(0, 50)
  if (sources.length === 0) return undefined
  return ComponentRenderFrameSchema.parse({
    protocol: 'agentskit.chat.component',
    version: 1,
    type: 'render',
    componentKey: 'source-list',
    instanceId: safeId(event.id, 'sources'),
    props: { label: 'Sources', sources },
    fallback: {
      kind: 'source-list',
      summary: `Sources: ${sources.map(source => source.title).join(', ')}.`.slice(0, 4_096),
    },
  })
}

/** Projects a validated Ask wire event into canonical ordered assistant content. */
export function projectAskEvent(event: AskEvent, projectTool?: AskToolProjector): AskProjection | undefined {
  if (event.type === 'text') return event.delta === '' ? undefined : { kind: 'text', text: event.delta }
  if (event.type === 'error') return { kind: 'error', message: event.message }
  if (event.type === 'done') return { kind: 'done' }
  if (event.name === 'answer' && typeof event.args.markdown === 'string') {
    return event.args.markdown === '' ? undefined : { kind: 'text', text: event.args.markdown }
  }
  if (event.name === 'cite') {
    const frame = sourceListFrame(event)
    return frame === undefined ? undefined : { kind: 'component', frame }
  }
  try {
    const custom = projectTool?.(event)
    const parsed = ComponentRenderFrameSchema.safeParse(custom)
    return parsed.success ? { kind: 'component', frame: parsed.data } : undefined
  } catch {
    return undefined
  }
}

export function projectAskMessages(messages: readonly Message[]): Array<{ readonly role: 'user' | 'assistant'; readonly content: string }> {
  const projected: Array<{ readonly role: 'user' | 'assistant'; readonly content: string }> = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    if (message.role === 'user') {
      projected.push({ role: message.role, content: message.content })
      continue
    }
    const decoded = decodeAssistantContent(message.content)
    const content = decoded.ok
      ? decoded.parts.map(part => part.kind === 'text' ? part.text : `[${part.frame.componentKey}]`).join('\n').trim()
      : message.content
    projected.push({ role: message.role, content })
  }
  return projected
}

const endpointWithParams = ({ endpoint = DEFAULT_ENDPOINT, corpus, persona }: AskAdapterOptions): string => {
  const relative = endpoint.startsWith('/')
  const origin = typeof globalThis.location === 'undefined' ? 'http://localhost' : globalThis.location.origin
  const url = new URL(endpoint, origin)
  if (corpus?.trim()) url.searchParams.set('corpus', corpus)
  if (persona?.trim()) url.searchParams.set('persona', persona)
  return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

type EncodeAssistantPart = (part: AssistantContentPart) => string

const createBoundedAssistantEncoder = (): EncodeAssistantPart => {
  const encoder = createAssistantContentEncoder()
  let bytes = 0
  let records = 0
  return part => {
    if (records >= ASSISTANT_CONTENT_MAX_RECORDS) throw new Error('Ask response exceeded the assistant content record limit.')
    const encoded = encoder.encode(part)
    const nextBytes = bytes + new TextEncoder().encode(encoded).byteLength
    if (nextBytes > ASSISTANT_CONTENT_MAX_BYTES) throw new Error('Ask response exceeded the assistant content byte limit.')
    bytes = nextBytes
    records += 1
    return encoded
  }
}

const encodeText = function* (encode: EncodeAssistantPart, text: string): Generator<StreamChunk> {
  for (let offset = 0; offset < text.length; offset += MAX_TEXT_CHARS) {
    yield { type: 'text', content: encode({ kind: 'text', text: text.slice(offset, offset + MAX_TEXT_CHARS) }) }
  }
}

/** Creates the shared Ask adapter without replacing the AgentsKit controller or message model. */
export function createAskAdapter(options: AskAdapterOptions = {}): AskAdapter {
  const createSourceForSession = (request: AdapterRequest, sessionId: string): StreamSource => {
    const controller = new AbortController()
    const escalation = AnswerResponseSchema.safeParse(request.context?.metadata?.['agentskit.chat.escalation'])
    const deterministic = escalation.success && escalation.data.outcome === 'escalation' ? escalation.data : undefined
    return {
      abort: () => controller.abort(),
      async *stream(): AsyncIterableIterator<StreamChunk> {
        const encode = createBoundedAssistantEncoder()
        try {
          const connection = new AbortController()
          const timeout = setTimeout(() => connection.abort(), DEFAULT_CONNECTION_TIMEOUT_MS)
          let response: Response
          try {
            response = await fetch(endpointWithParams(options), {
              method: 'POST',
              signal: AbortSignal.any([controller.signal, connection.signal]),
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                protocol: 'agentskit.chat.ask',
                version: 1,
                ...(sessionId === 'unscoped' ? {} : { sessionId }),
                messages: projectAskMessages(request.messages),
                ...(deterministic === undefined ? {} : { deterministic }),
              }),
            })
          } finally {
            clearTimeout(timeout)
          }
          if (!response.ok || response.body === null) throw new Error(`Ask request failed (${response.status}).`)

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
          let mode: 'unknown' | 'ndjson' | 'text' = contentType.includes('text/plain')
            ? 'text'
            : contentType.includes('ndjson')
              ? 'ndjson'
              : 'unknown'
          let discardingOversizedLine = false
          while (true) {
            const result = await reader.read()
            let incoming = decoder.decode(result.value, { stream: !result.done })
            if (discardingOversizedLine) {
              const lineEnd = incoming.indexOf('\n')
              if (lineEnd < 0) {
                if (result.done) break
                continue
              }
              incoming = incoming.slice(lineEnd + 1)
              discardingOversizedLine = false
            }
            buffer += incoming
            if (mode === 'unknown' && buffer.trimStart() !== '') {
              if (!buffer.trimStart().startsWith('{')) mode = 'text'
              else {
                const lineEnd = buffer.indexOf('\n')
                if (lineEnd >= 0 || result.done) {
                  const firstLine = lineEnd >= 0 ? buffer.slice(0, lineEnd + 1) : `${buffer}\n`
                  mode = decodeAskEvents(firstLine).events.length > 0 ? 'ndjson' : 'text'
                } else if (new TextEncoder().encode(buffer).byteLength > ASK_EVENT_MAX_BYTES) {
                  buffer = ''
                  discardingOversizedLine = true
                }
              }
            }
            if (mode === 'unknown' && !result.done) continue
            if (mode === 'text') {
              yield* encodeText(encode, buffer)
              buffer = ''
              if (result.done) break
              continue
            }
            const decoded = decodeAskEvents(result.done ? `${buffer}\n` : buffer)
            buffer = decoded.rest
            discardingOversizedLine = decoded.discardedPartial
            for (const event of decoded.events) {
              const projected = projectAskEvent(event, options.projectTool)
              if (projected?.kind === 'error') {
                void reader.cancel().catch(() => undefined)
                yield { type: 'error', content: projected.message }
                return
              }
              if (projected?.kind === 'done') {
                void reader.cancel().catch(() => undefined)
                yield { type: 'done' }
                return
              }
              if (projected?.kind === 'text') yield* encodeText(encode, projected.text)
              if (projected?.kind === 'component') {
                yield { type: 'text', content: encode({ kind: 'component', frame: projected.frame }) }
              }
            }
            if (result.done) break
          }
          yield { type: 'done' }
        } catch (cause) {
          if (!controller.signal.aborted) {
            yield { type: 'error', content: cause instanceof Error ? cause.message : 'Ask request failed.' }
          }
        }
      },
    }
  }
  return {
    capabilities: { streaming: true, structuredOutput: true },
    createSource: request => createSourceForSession(request, 'unscoped'),
    createSourceForSession,
  }
}

const legacyContent = (record: Record<string, unknown>, projectTool?: AskToolProjector): string | undefined => {
  const direct = typeof record.content === 'string' ? record.content : typeof record.text === 'string' ? record.text : undefined
  if (direct !== undefined) return direct
  if (record.role !== 'assistant' || !Array.isArray(record.parts)) return undefined
  const encode = createBoundedAssistantEncoder()
  const encoded: string[] = []
  for (const candidate of record.parts) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) continue
    const part = candidate as Record<string, unknown>
    let projected: AssistantContentPart | undefined
    if (part.kind === 'text' && typeof part.text === 'string') {
      if (part.text === '') continue
      for (let offset = 0; offset < part.text.length; offset += MAX_TEXT_CHARS) {
        try {
          encoded.push(encode({ kind: 'text', text: part.text.slice(offset, offset + MAX_TEXT_CHARS) }))
        } catch {
          return encoded.join('')
        }
      }
      continue
    } else if (part.kind === 'tool' && typeof part.id === 'string' && typeof part.name === 'string'
      && typeof part.args === 'object' && part.args !== null && !Array.isArray(part.args)) {
      const result = projectAskEvent({ type: 'tool', id: part.id, name: part.name, args: part.args as Record<string, unknown> }, projectTool)
      if (result?.kind === 'text') {
        for (let offset = 0; offset < result.text.length; offset += MAX_TEXT_CHARS) {
          try {
            encoded.push(encode({ kind: 'text', text: result.text.slice(offset, offset + MAX_TEXT_CHARS) }))
          } catch {
            return encoded.length > 0 ? encoded.join('') : undefined
          }
        }
        continue
      }
      if (result?.kind === 'component') projected = { kind: 'component', frame: result.frame }
    } else continue
    if (projected !== undefined) {
      try {
        encoded.push(encode(projected))
      } catch {
        return encoded.length > 0 ? encoded.join('') : undefined
      }
    }
  }
  return encoded.length > 0 || record.parts.length === 0 ? encoded.join('') : undefined
}

const migrateLegacyMessages = (value: unknown, projectTool?: AskToolProjector): readonly Message[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const messages: Message[] = []
  for (const [index, candidate] of value.entries()) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) continue
    const record = candidate as Record<string, unknown>
    if (record.role !== 'user' && record.role !== 'assistant') continue
    const content = legacyContent(record, projectTool)
    if (content === undefined) continue
    messages.push({
      id: safeId(typeof record.id === 'string' ? record.id : '', `legacy-${index + 1}`),
      role: record.role,
      content,
      status: 'complete',
      createdAt: new Date(index),
    })
  }
  return messages.length > 0 || value.length === 0 ? messages : undefined
}

/** Composes Ask legacy migration over the released, validated Web Storage ChatMemory. */
export function createAskSessionMemory({
  key,
  legacyKeys = [],
  maxMessages = 20,
  maxRecordBytes = ASK_EVENT_MAX_BYTES,
  getStorage = () => {
    try {
      return typeof globalThis.sessionStorage === 'undefined' ? undefined : globalThis.sessionStorage
    } catch {
      return undefined
    }
  },
  projectTool,
}: AskMemoryOptions): ChatMemory {
  return createWebStorageMemory({
    key,
    getStorage,
    maxMessages,
    maxRecordBytes,
    migration: {
      keys: legacyKeys,
      read: value => migrateLegacyMessages(value, projectTool),
    },
  })
}
