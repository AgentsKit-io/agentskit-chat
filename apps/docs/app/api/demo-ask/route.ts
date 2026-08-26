import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODELS = [
  'stealth/ox-alpha',
  'cohere/north-mini-code:free',
  'google/gemma-4-31b-it:free',
  'openrouter/free',
] as const

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(16_384),
}).strict()

const RequestSchema = z.object({
  protocol: z.literal('agentskit.chat.ask'),
  version: z.literal(1),
  messages: z.array(MessageSchema).min(1).max(20),
}).passthrough()

type OpenRouterChunk = {
  readonly model?: unknown
  readonly choices?: readonly [{ readonly delta?: { readonly content?: unknown } }]
}

const requestIp = (request: Request): string =>
  request.headers.get('x-real-ip')?.trim()
  ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  ?? 'unknown'

// ponytail: one process-local window is enough for a five-minute demo; use a shared limiter if this becomes a permanent public endpoint.
const windows = new Map<string, { startedAt: number; count: number }>()
const MAX_REQUESTS_PER_MINUTE = 10

const allowed = (ip: string): boolean => {
  const now = Date.now()
  const current = windows.get(ip)
  if (current === undefined || now - current.startedAt >= 60_000) {
    windows.set(ip, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= MAX_REQUESTS_PER_MINUTE) return false
  current.count += 1
  return true
}

const json = (body: unknown, status: number): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const textDelta = (value: unknown): string => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ''
  const chunk = value as OpenRouterChunk
  const delta = chunk.choices?.[0]?.delta?.content
  return typeof delta === 'string' ? delta : ''
}

const modelName = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const model = (value as OpenRouterChunk).model
  return typeof model === 'string' ? model : undefined
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return json({ error: 'AI demo is not configured.' }, 503)
  if (!allowed(requestIp(request))) return json({ error: 'AI demo rate limit reached. Try again in a minute.' }, 429)

  const body = RequestSchema.safeParse(await request.json().catch(() => undefined))
  if (!body.success) return json({ error: 'Invalid chat request.' }, 400)

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: request.signal,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'HTTP-Referer': 'https://chat.agentskit.io/docs/examples/deterministic-chat',
      'X-Title': 'AgentsKit Chat deterministic demo',
    },
    body: JSON.stringify({
      model: MODELS[0],
      models: MODELS.slice(1),
      messages: body.data.messages,
      stream: true,
      temperature: 0.9,
      max_tokens: 360,
    }),
  }).catch(() => undefined)

  if (upstream === undefined || !upstream.ok || upstream.body === null) {
    return json({ error: 'OpenRouter is temporarily unavailable.' }, 502)
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader()
      let buffer = ''
      let selectedModel: string | undefined
      const emit = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      try {
        while (true) {
          const result = await reader.read()
          buffer += decoder.decode(result.value, { stream: !result.done })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const raw = line.slice(5).trim()
            if (raw === '' || raw === '[DONE]') continue
            try {
              const parsed: unknown = JSON.parse(raw)
              selectedModel ??= modelName(parsed)
              const delta = textDelta(parsed)
              if (delta !== '') emit({ type: 'text', delta })
            } catch { /* malformed upstream frames are inert */ }
          }
          if (result.done) break
        }
        emit({ type: 'done', ...(selectedModel === undefined ? {} : { model: selectedModel }) })
        controller.close()
      } catch {
        emit({ type: 'error', message: 'OpenRouter stream failed.', code: 'AI_STREAM_FAILED', retryable: true })
        controller.close()
      } finally {
        reader.releaseLock()
      }
    },
  })

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  })
}
