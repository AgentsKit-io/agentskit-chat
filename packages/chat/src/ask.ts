import type { AdapterFactory, ChatMemory, Message, StreamChunk } from '@agentskit/core'
import { createWebStorageMemory, type WebStorageLike } from '@agentskit/memory/web-storage'
import {
  ComponentRenderFrameSchema,
  createAssistantContentEncoder,
  decodeAssistantContent,
  type AssistantContentPart,
  type ComponentRenderFrame,
} from '@agentskit/chat-protocol'
import { z } from 'zod'

const MAX_NDJSON_BYTES = 1_048_576
const MAX_TEXT_CHARS = 16_384
const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000
const DEFAULT_ENDPOINT = 'https://ask.agentskit.io/v1/ask'

const AskArgsSchema = z.record(z.string().max(128), z.unknown())

export const AskEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string().max(MAX_NDJSON_BYTES) }).strict(),
  z.object({ type: z.literal('tool'), id: z.string().max(256), name: z.string().max(128), args: AskArgsSchema }).strict(),
  z.object({ type: z.literal('done'), model: z.string().max(256).optional() }).strict(),
  z.object({ type: z.literal('error'), message: z.string().min(1).max(4_096) }).strict(),
])

export type AskEvent = z.infer<typeof AskEventSchema>
export type AskToolEvent = Extract<AskEvent, { readonly type: 'tool' }>
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

const byteLength = (value: string): number => new TextEncoder().encode(value).byteLength

/** Decodes complete, runtime-validated Ask NDJSON records and retains one partial line. */
export function decodeAskEvents(buffer: string): { readonly events: readonly AskEvent[]; readonly rest: string } {
  if (byteLength(buffer) > MAX_NDJSON_BYTES) return { events: Object.freeze([]), rest: '' }
  const lines = buffer.split('\n')
  const rest = lines.pop() ?? ''
  const events = lines.flatMap((line): AskEvent[] => {
    const candidate = line.trim()
    if (candidate === '' || byteLength(candidate) > MAX_NDJSON_BYTES) return []
    try {
      const parsed = AskEventSchema.safeParse(JSON.parse(candidate) as unknown)
      return parsed.success ? [parsed.data] : []
    } catch {
      return []
    }
  })
  return { events: Object.freeze(events), rest }
}

const safeId = (value: string, fallback: string): string => {
  const normalized = value.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 128)
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : fallback
}

const safeHref = (path: string, anchor?: string): string | undefined => {
  const fragment = anchor?.replace(/^#/, '')
  if (/^\/(?!\/)/.test(path)) {
    const url = new URL(path, 'https://agentskit.invalid')
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

const encodeText = function* (encoder: ReturnType<typeof createAssistantContentEncoder>, text: string): Generator<StreamChunk> {
  for (let offset = 0; offset < text.length; offset += MAX_TEXT_CHARS) {
    yield { type: 'text', content: encoder.encode({ kind: 'text', text: text.slice(offset, offset + MAX_TEXT_CHARS) }) }
  }
}

/** Creates the shared Ask adapter without replacing the AgentsKit controller or message model. */
export function createAskAdapter(options: AskAdapterOptions = {}): AdapterFactory {
  return {
    capabilities: { streaming: true, structuredOutput: true },
    createSource(request) {
      const controller = new AbortController()
      return {
        abort: () => controller.abort(),
        async *stream(): AsyncIterableIterator<StreamChunk> {
          const encoder = createAssistantContentEncoder()
          try {
            const connection = new AbortController()
            const timeout = setTimeout(() => connection.abort(), DEFAULT_CONNECTION_TIMEOUT_MS)
            let response: Response
            try {
              response = await fetch(endpointWithParams(options), {
                method: 'POST',
                signal: AbortSignal.any([controller.signal, connection.signal]),
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ messages: projectAskMessages(request.messages) }),
              })
            } finally {
              clearTimeout(timeout)
            }
            if (!response.ok || response.body === null) throw new Error(`Ask request failed (${response.status}).`)

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let mode: 'unknown' | 'ndjson' | 'text' = 'unknown'
            while (true) {
              const result = await reader.read()
              buffer += decoder.decode(result.value, { stream: !result.done })
              if (byteLength(buffer) > MAX_NDJSON_BYTES) throw new Error('Ask response exceeded its safety limit.')
              if (mode === 'unknown' && buffer.trimStart() !== '') mode = buffer.trimStart().startsWith('{') ? 'ndjson' : 'text'
              if (mode === 'text') {
                yield* encodeText(encoder, buffer)
                buffer = ''
                if (result.done) break
                continue
              }
              const decoded = decodeAskEvents(result.done ? `${buffer}\n` : buffer)
              buffer = decoded.rest
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
                if (projected?.kind === 'text') yield* encodeText(encoder, projected.text)
                if (projected?.kind === 'component') {
                  yield { type: 'text', content: encoder.encode({ kind: 'component', frame: projected.frame }) }
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
    },
  }
}

const legacyContent = (record: Record<string, unknown>, projectTool?: AskToolProjector): string | undefined => {
  const direct = typeof record.content === 'string' ? record.content : typeof record.text === 'string' ? record.text : undefined
  if (direct !== undefined) return direct
  if (record.role !== 'assistant' || !Array.isArray(record.parts)) return undefined
  const encoder = createAssistantContentEncoder()
  const encoded: string[] = []
  for (const candidate of record.parts) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return undefined
    const part = candidate as Record<string, unknown>
    let projected: AssistantContentPart | undefined
    if (part.kind === 'text' && typeof part.text === 'string') {
      if (part.text === '') continue
      for (let offset = 0; offset < part.text.length; offset += MAX_TEXT_CHARS) {
        encoded.push(encoder.encode({ kind: 'text', text: part.text.slice(offset, offset + MAX_TEXT_CHARS) }))
      }
      continue
    } else if (part.kind === 'tool' && typeof part.id === 'string' && typeof part.name === 'string'
      && typeof part.args === 'object' && part.args !== null && !Array.isArray(part.args)) {
      const result = projectAskEvent({ type: 'tool', id: part.id, name: part.name, args: part.args as Record<string, unknown> }, projectTool)
      if (result?.kind === 'text') projected = { kind: 'text', text: result.text }
      if (result?.kind === 'component') projected = { kind: 'component', frame: result.frame }
    } else {
      return undefined
    }
    if (projected !== undefined) encoded.push(encoder.encode(projected))
  }
  return encoded.join('')
}

const migrateLegacyMessages = (value: unknown, projectTool?: AskToolProjector): readonly Message[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const messages: Message[] = []
  for (const [index, candidate] of value.entries()) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return undefined
    const record = candidate as Record<string, unknown>
    if (record.role !== 'user' && record.role !== 'assistant') return undefined
    const content = legacyContent(record, projectTool)
    if (content === undefined) return undefined
    messages.push({
      id: safeId(typeof record.id === 'string' ? record.id : '', `legacy-${index + 1}`),
      role: record.role,
      content,
      status: 'complete',
      createdAt: new Date(index),
    })
  }
  return messages
}

/** Composes Ask legacy migration over the released, validated Web Storage ChatMemory. */
export function createAskSessionMemory({
  key,
  legacyKeys = [],
  maxMessages = 20,
  maxRecordBytes = MAX_NDJSON_BYTES,
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
