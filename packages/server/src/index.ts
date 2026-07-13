import { createChatController } from '@agentskit/core'
import type { ChatState, Message } from '@agentskit/core'
import { resumeChatSession, SessionConflictError } from '@agentskit/chat'
import type { ChatDefinition, SessionStorage } from '@agentskit/chat'
import { createSnapshotEvent, decodeTurnEvent, encodeTurnEvent, TurnEventSchema } from '@agentskit/chat-protocol'
import type { TurnDiagnostic } from '@agentskit/chat-protocol'

import { readBoundedJson, withAbort } from './internal.js'

export * from './ask-service.js'

export type ChatHandler = (request: Request) => Promise<Response>
export type AuthenticationResult<TContext> = { readonly ok: true; readonly context: TContext } | { readonly ok: false; readonly response: Response }

export interface ChatHandlerOptions<TContext = undefined> {
  readonly authenticate?: (request: Request, signal: AbortSignal) => AuthenticationResult<TContext> | Promise<AuthenticationResult<TContext>>
  readonly resolveDefinition: (context: TContext | undefined, sessionId: string, signal: AbortSignal) => ChatDefinition | Promise<ChatDefinition>
  readonly sessionStorage: (context: TContext | undefined, signal: AbortSignal) => SessionStorage
  readonly timeoutMs?: number
  readonly cleanupTimeoutMs?: number
  readonly maxBodyBytes?: number
  readonly now?: () => Date
  readonly createId?: () => string
}

export class ChatHandlerError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean
  constructor(options: { readonly status: number; readonly code: string; readonly message: string; readonly retryable?: boolean }) {
    super(options.message); this.name = 'ChatHandlerError'; this.status = options.status; this.code = options.code; this.retryable = options.retryable ?? false
  }
}

const encoder = new TextEncoder()
const json = (diagnostic: TurnDiagnostic, status: number): Response => new Response(JSON.stringify({ error: diagnostic }), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})
const safeError = (error: unknown): { readonly status: number; readonly diagnostic: TurnDiagnostic } => error instanceof ChatHandlerError
  ? { status: error.status, diagnostic: { version: 1, code: error.code, message: error.message, retryable: error.retryable } }
  : error instanceof SessionConflictError
    ? { status: 409, diagnostic: { version: 1, code: 'SESSION_CONFLICT', message: 'Another turn is active for this session.', retryable: true } }
    : { status: 500, diagnostic: { version: 1, code: 'SERVER_INTERNAL', message: 'The chat request failed.', retryable: true } }
const fail = (status: number, code: string, message: string, retryable = false): never => { throw new ChatHandlerError({ status, code, message, retryable }) }
const readBody = async (request: Request, maxBodyBytes: number, signal: AbortSignal): Promise<unknown> => {
  return readBoundedJson(request, maxBodyBytes, signal, fail)
}

const snapshotStatus = (state: ChatState): 'idle' | 'streaming' | 'complete' | 'error' =>
  state.status === 'error' ? 'error' : state.status === 'streaming' ? 'streaming' : state.messages.length === 0 ? 'idle' : 'complete'

export const createChatHandler = <TContext = undefined>(options: ChatHandlerOptions<TContext>): ChatHandler => {
  const timeoutMs = options.timeoutMs ?? 30_000
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? 5_000
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024
  if (![timeoutMs, cleanupTimeoutMs, maxBodyBytes].every(value => Number.isSafeInteger(value) && value > 0)) fail(500, 'SERVER_INVALID_CONFIG', 'Chat handler configuration is invalid.')
  const leaseMs = timeoutMs + (3 * cleanupTimeoutMs)
  if (!Number.isSafeInteger(leaseMs)) fail(500, 'SERVER_INVALID_CONFIG', 'Chat handler configuration is invalid.')
  const createId = options.createId ?? (() => crypto.randomUUID())

  return async request => {
    const deadline = AbortSignal.timeout(timeoutMs)
    const signal = AbortSignal.any([request.signal, deadline])
    try {
      if (request.method !== 'POST') fail(405, 'REQUEST_METHOD_NOT_ALLOWED', 'Only POST is supported.')
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'REQUEST_UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.')
      let context: TContext | undefined
      if (options.authenticate) {
        const authenticated = await withAbort(options.authenticate(request, signal), signal)
        if (!authenticated.ok) return authenticated.response
        context = authenticated.context
      }
      const decoded = decodeTurnEvent(await readBody(request, maxBodyBytes, signal))
      if (!decoded.ok || decoded.event.event !== 'client.turn.submit') return fail(400, 'REQUEST_INVALID_EVENT', 'Request body must be a valid turn submission.')
      const submission = decoded.event
      const definition = await withAbort(options.resolveDefinition(context, submission.sessionId, signal), signal)
      const storage = options.sessionStorage(context, signal)
      const session = await withAbort(resumeChatSession(definition, { sessionId: submission.sessionId, storage, signal, ...(options.now ? { now: options.now } : {}) }), signal)
      if (!(await withAbort(session.claimTurn(submission.turnId, leaseMs, signal), signal))) return json({ version: 1, code: 'SESSION_BUSY', message: 'Another turn is active for this session.', retryable: true }, 409)

      const memory = definition.chat.memory
      const loaded = memory ? await withAbort(memory.load({ signal }), signal) : definition.chat.initialMessages ?? []
      const messages: readonly Message[] = loaded.length > 0 ? loaded : definition.chat.initialMessages ?? []
      const { memory: _memory, ...chat } = definition.chat
      const controller = createChatController(session.updateChat({ ...chat, initialMessages: [...messages] }))
      let pending: ChatState | undefined
      let wake: (() => void) | undefined
      let done = false
      let closed = false
      const push = (): void => {
        const state = controller.getState()
        pending = { ...state, messages: [...state.messages], usage: { ...state.usage } }
        wake?.(); wake = undefined
      }
      const unsubscribe = controller.subscribe(push)
      let cleanup: (stop: boolean) => Promise<void> = async () => undefined
      const abort = (): void => { controller.stop(); void cleanup(true).catch(() => undefined) }
      signal.addEventListener('abort', abort, { once: true })
      const send = controller.send(submission.payload.input).finally(() => { done = true; wake?.(); wake = undefined })

      cleanup = async (stop: boolean): Promise<void> => {
        if (closed) return
        closed = true
        unsubscribe(); signal.removeEventListener('abort', abort)
        if (stop && !signal.aborted) controller.stop()
        const settleSignal = AbortSignal.timeout(cleanupTimeoutMs)
        await withAbort(send.catch(() => undefined), settleSignal).catch(() => undefined)
        const saveSignal = AbortSignal.timeout(cleanupTimeoutMs)
        let outcome: 'completed' | 'indeterminate' = 'completed'
        try { await withAbort(memory?.save(controller.getState().messages, { signal: saveSignal }), saveSignal) }
        catch (error) { outcome = 'indeterminate'; throw error }
        finally {
          const releaseSignal = AbortSignal.timeout(cleanupTimeoutMs)
          await withAbort(session.releaseTurn(submission.turnId, outcome, releaseSignal), releaseSignal)
        }
      }
      const diagnosticLine = (code: string, message: string): Uint8Array => {
        const event = TurnEventSchema.parse({
          protocol: 'agentskit.chat.turn', version: 1, eventId: createId(), sessionId: submission.sessionId, turnId: submission.turnId,
          sequence: session.getCursor() + 1, emittedAt: (options.now?.() ?? new Date()).toISOString(), event: 'server.turn.diagnostic',
          payload: { version: 1, code, message, retryable: true },
        })
        return encoder.encode(`${encodeTurnEvent(event)}\n`)
      }

      const body = new ReadableStream<Uint8Array>({
        async pull(stream) {
          try {
            while (!pending && !done && !signal.aborted) await new Promise<void>(resolve => { wake = resolve })
            if (signal.aborted) {
              stream.enqueue(diagnosticLine(deadline.aborted ? 'SERVER_TIMEOUT' : 'REQUEST_CANCELLED', deadline.aborted ? 'The chat request timed out.' : 'The chat request was cancelled.'))
              await cleanup(true)
              stream.close()
              return
            }
            if (pending) {
              const state = pending; pending = undefined
              await withAbort(session.persist(signal), signal)
              const event = createSnapshotEvent({
                eventId: createId(), sessionId: submission.sessionId, turnId: submission.turnId, sequence: session.getCursor(), emittedAt: (options.now?.() ?? new Date()).toISOString(),
                messages: state.messages, status: snapshotStatus(state), usage: state.usage, lineage: { operation: 'submit' },
                ...(state.error ? { error: { version: 1, code: 'CHAT_TURN_FAILED', message: 'The chat turn failed.', retryable: true } } : {}),
              })
              stream.enqueue(encoder.encode(`${encodeTurnEvent(event)}\n`))
              return
            }
            await cleanup(false)
            stream.close()
          } catch (error) {
            const safe = safeError(error)
            try { stream.enqueue(diagnosticLine(safe.diagnostic.code, safe.diagnostic.message)) } catch { /* stream already unavailable */ }
            await cleanup(true).catch(() => undefined)
            stream.close()
          }
        },
        async cancel() { await cleanup(true).catch(() => undefined) },
      })
      return new Response(body, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
    } catch (error) {
      if (signal.aborted) return json({ version: 1, code: deadline.aborted ? 'SERVER_TIMEOUT' : 'REQUEST_CANCELLED', message: deadline.aborted ? 'The chat request timed out.' : 'The chat request was cancelled.', retryable: true }, deadline.aborted ? 408 : 499)
      const safe = safeError(error)
      return json(safe.diagnostic, safe.status)
    }
  }
}
