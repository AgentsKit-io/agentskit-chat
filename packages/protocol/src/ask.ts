import { z } from 'zod'

export const ASK_EVENT_MAX_BYTES = 1_048_576
export const ASK_EVENT_MAX_RECORDS = 4_096
export const ASK_SERVICE_PROTOCOL_VERSION = 1 as const

const AskArgsSchema = z.record(z.string().max(128), z.unknown())

export const AskEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string().max(ASK_EVENT_MAX_BYTES) }).strict(),
  z.object({ type: z.literal('tool'), id: z.string().max(256), name: z.string().max(128), args: AskArgsSchema }).strict(),
  z.object({ type: z.literal('done'), model: z.string().max(256).optional() }).strict(),
  z.object({
    type: z.literal('error'),
    message: z.string().min(1).max(4_096),
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/).optional(),
    retryable: z.boolean().optional(),
  }).strict(),
])

export type AskEvent = z.infer<typeof AskEventSchema>
export type AskToolEvent = Extract<AskEvent, { readonly type: 'tool' }>

const byteLength = (value: string): number => new TextEncoder().encode(value).byteLength

export interface AskEventDecodeResult {
  readonly events: readonly AskEvent[]
  readonly rest: string
  readonly discardedPartial: boolean
}

/** Decodes bounded complete v1 Ask NDJSON records and retains one bounded partial line. */
export function decodeAskEvents(buffer: string): AskEventDecodeResult {
  const events: AskEvent[] = []
  let cursor = 0
  let records = 0
  while (records < ASK_EVENT_MAX_RECORDS) {
    const lineEnd = buffer.indexOf('\n', cursor)
    if (lineEnd < 0) break
    const line = buffer.slice(cursor, lineEnd)
    cursor = lineEnd + 1
    records += 1
    const candidate = line.trim()
    if (candidate === '' || byteLength(candidate) > ASK_EVENT_MAX_BYTES) continue
    try {
      const parsed = AskEventSchema.safeParse(JSON.parse(candidate) as unknown)
      if (parsed.success) events.push(parsed.data)
    } catch {
      // Malformed records are inert.
    }
  }
  if (records === ASK_EVENT_MAX_RECORDS) {
    const lastLineEnd = buffer.lastIndexOf('\n')
    if (lastLineEnd >= cursor) cursor = lastLineEnd + 1
  }
  const partial = buffer.slice(cursor)
  const discardedPartial = byteLength(partial) > ASK_EVENT_MAX_BYTES
  return { events: Object.freeze(events), rest: discardedPartial ? '' : partial, discardedPartial }
}
