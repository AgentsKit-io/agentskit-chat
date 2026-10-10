import { anySignal, withTimeout } from '@agentskit/net'
import { createChatController } from '@agentskit/core'
import type { ChatState, ContentPart, Message, TokenUsage, ToolDecisionStore } from '@agentskit/core'
import type { CostStore } from '@agentskit/observability'
import { resumeChatSession, SessionConflictError } from '@agentskit/chat'
import type { ChatDefinition, SessionStorage } from '@agentskit/chat'
import { ACTION_DECIDE_CAPABILITY, createSnapshotEvent, decodeTurnEvent, encodeTurnEvent, TURN_PARTS_CAPABILITY, TurnEventSchema } from '@agentskit/chat-protocol'
import type { TurnDiagnostic } from '@agentskit/chat-protocol'

import { deliverUploadParts, resolveUploadParts, toContentParts, UploadError, validateUploadPolicy } from './uploads.js'
import type { UploadPolicy } from './uploads.js'

import { readBoundedJson } from './internal.js'

export * from './ask-service.js'
export * from './uploads.js'

export type ChatHandler = (request: Request) => Promise<Response>
export type AuthenticationResult<TContext> = { readonly ok: true; readonly context: TContext } | { readonly ok: false; readonly response: Response }

export interface ChatHandlerOptions<TContext = undefined> {
  /** Absolute deadline shared by request work; callback promises still need to honor their signal to stop their own work. */
  readonly timeoutMs?: number
  /** Deadline for each cleanup phase: settle, save memory, and release the active turn. */
  readonly cleanupTimeoutMs?: number
  readonly authenticate?: (request: Request, signal: AbortSignal) => AuthenticationResult<TContext> | Promise<AuthenticationResult<TContext>>
  readonly resolveDefinition: (context: TContext | undefined, sessionId: string, signal: AbortSignal) => ChatDefinition | Promise<ChatDefinition>
  readonly sessionStorage: (context: TContext | undefined, signal: AbortSignal) => SessionStorage
  /**
   * Durable decision store scoped to the authorized tenant and session. Enables `client.action.decide`:
   * confirmation-required tool calls are recorded as pending and decided in a later request, with one atomic claim.
   */
  readonly decisions?: (context: TContext | undefined, sessionId: string, signal: AbortSignal) => ToolDecisionStore | Promise<ToolDecisionStore>
  /** Enables per-tenant spend control: reserve before the model runs, commit real usage after, release on failure. */
  readonly cost?: (context: TContext | undefined, sessionId: string, signal: AbortSignal) => TurnCostPolicy | undefined | Promise<TurnCostPolicy | undefined>
  readonly uploads?: UploadPolicy & { readonly tenantId: (context: TContext | undefined, sessionId: string, signal: AbortSignal) => string | Promise<string> }
  readonly maxBodyBytes?: number
  readonly now?: () => Date
  readonly createId?: () => string
}

/** Spend policy of one turn, resolved per request from the authenticated tenant and its plan. */
export interface TurnCostPolicy {
  /** Durable upstream store; the reservation is admitted atomically against `capUsd`. */
  readonly store: CostStore
  readonly tenant: string
  /** Tenant cap for the store's current accounting window, read from the host's plan data. Omit for no ceiling. */
  readonly capUsd?: number
  /** Upper estimate held before the model is called. */
  readonly reserveUsd: number
  /** Real cost of the turn from its token usage. */
  readonly priceUsd: (usage: TokenUsage) => number
  /** Recorded in the usage ledger. */
  readonly model: string
  readonly source?: string
  readonly fallback?: boolean
  /** Utilization at which the first snapshot carries `quota.warning`. Default 0.8. */
  readonly warnAt?: number
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
const safeError = (error: unknown): { readonly status: number; readonly diagnostic: TurnDiagnostic } => (error instanceof ChatHandlerError || error instanceof UploadError)
  ? { status: error.status, diagnostic: { version: 1, code: error.code, message: error.message, retryable: error instanceof ChatHandlerError ? error.retryable : false } }
  : error instanceof SessionConflictError
    ? { status: 409, diagnostic: { version: 1, code: 'SESSION_CONFLICT', message: 'Another turn is active for this session.', retryable: true } }
    : { status: 500, diagnostic: { version: 1, code: 'SERVER_INTERNAL', message: 'The chat request failed.', retryable: true } }
const fail = (status: number, code: string, message: string, retryable = false): never => { throw new ChatHandlerError({ status, code, message, retryable }) }
const DECISION_ERRORS: Readonly<Record<string, ChatHandlerError>> = {
  AK_ACTION_NOT_FOUND: new ChatHandlerError({ status: 404, code: 'ACTION_NOT_FOUND', message: 'No pending action matches this token.' }),
  AK_ACTION_ALREADY_DECIDED: new ChatHandlerError({ status: 409, code: 'ACTION_ALREADY_DECIDED', message: 'This action was already decided.' }),
}
/** Maps the upstream decision errors to protocol diagnostics; anything else stays an internal failure. */
const decisionError = (error: unknown): unknown => DECISION_ERRORS[String((error as { readonly code?: unknown } | null)?.code)] ?? error
const readBody = async (request: Request, maxBodyBytes: number, signal: AbortSignal): Promise<unknown> => {
  return readBoundedJson(request, maxBodyBytes, signal, fail)
}

const snapshotStatus = (state: ChatState): 'idle' | 'streaming' | 'complete' | 'error' =>
  state.status === 'error' ? 'error' : state.status === 'streaming' ? 'streaming' : state.messages.length === 0 ? 'idle' : 'complete'

export const createChatHandler = <TContext = undefined>(options: ChatHandlerOptions<TContext>): ChatHandler => {
  if (options.uploads) validateUploadPolicy(options.uploads)
  const timeoutMs = options.timeoutMs ?? 30_000
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? 5_000
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024
  if (![timeoutMs, cleanupTimeoutMs, maxBodyBytes].every(value => Number.isSafeInteger(value) && value > 0)) fail(500, 'SERVER_INVALID_CONFIG', 'Chat handler configuration is invalid.')
  const leaseMs = timeoutMs + (3 * cleanupTimeoutMs)
  if (!Number.isSafeInteger(leaseMs)) fail(500, 'SERVER_INVALID_CONFIG', 'Chat handler configuration is invalid.')
  const createId = options.createId ?? (() => crypto.randomUUID())

  return async request => {
    const deadline = AbortSignal.timeout(timeoutMs)
    const signal = anySignal([request.signal, deadline])
    let cleanupAfterClaim: (() => Promise<void>) | undefined
    try {
      if (request.method !== 'POST') fail(405, 'REQUEST_METHOD_NOT_ALLOWED', 'Only POST is supported.')
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'REQUEST_UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.')
      let context: TContext | undefined
      if (options.authenticate) {
        const authenticated = await withTimeout(callbackSignal => Promise.resolve(options.authenticate!(request, callbackSignal)), timeoutMs, signal)
        if (!authenticated.ok) return authenticated.response
        context = authenticated.context
      }
      const decoded = decodeTurnEvent(await readBody(request, maxBodyBytes, signal))
      if (!decoded.ok || (decoded.event.event !== 'client.turn.submit' && decoded.event.event !== 'client.action.decide')) return fail(400, 'REQUEST_INVALID_EVENT', 'Request body must be a valid turn submission or action decision.')
      const submission = decoded.event
      const decision = submission.event === 'client.action.decide' ? submission.payload : undefined
      if (decision && !options.decisions) return fail(501, 'ACTION_DECIDE_UNAVAILABLE', 'Action decisions are not enabled on this server.')
      const input = submission.event === 'client.turn.submit' ? submission.payload.input : ''
      const uploads = options.uploads
      if (submission.event === 'client.turn.submit' && typeof input !== 'string') {
        if (!submission.payload.capabilities?.includes(TURN_PARTS_CAPABILITY)) fail(400, 'TURN_CAPABILITY_REQUIRED', 'Parts require explicit capability negotiation.')
        if (!uploads) return fail(501, 'TURN_PARTS_UNAVAILABLE', 'Parts are not enabled on this server.')
      }
      // The upload scope is resolved for every turn: earlier turns of the transcript may carry references too.
      const tenantId = uploads ? await withTimeout(callbackSignal => Promise.resolve(uploads.tenantId(context, submission.sessionId, callbackSignal)), timeoutMs, signal) : undefined
      let content: string | ContentPart[] = typeof input === 'string' ? input : []
      if (uploads && tenantId !== undefined && typeof input !== 'string') {
        content = toContentParts(await withTimeout(callbackSignal => resolveUploadParts(uploads, tenantId, submission.sessionId, input, callbackSignal), timeoutMs, signal))
      }
      const definition = await withTimeout(callbackSignal => Promise.resolve(options.resolveDefinition(context, submission.sessionId, callbackSignal)), timeoutMs, signal)
      // An adapter that declares it cannot take binary parts is refused here; parts are never flattened to text.
      if (typeof content !== 'string' && definition.chat.adapter.capabilities?.multiModal === false && content.some(part => part.type !== 'text')) {
        return fail(422, 'TURN_PARTS_UNSUPPORTED', 'The configured model does not accept file parts.')
      }
      const decisions = options.decisions
      const decisionStore = decisions ? await withTimeout(callbackSignal => Promise.resolve(decisions(context, submission.sessionId, callbackSignal)), timeoutMs, signal) : undefined
      const memory = definition.chat.memory
      const settled = decision ? await withTimeout(() => decisionStore!.get(decision.token), timeoutMs, signal) : undefined
      if (decision) {
        if (!settled) return fail(404, 'ACTION_NOT_FOUND', 'No pending action matches this token.')
        if (settled.status !== 'pending' && settled.decision !== decision.decision) return fail(409, 'ACTION_ALREADY_DECIDED', 'This action was already decided.')
      }
      const storage = options.sessionStorage(context, signal)
      const session = await withTimeout(callbackSignal => resumeChatSession(definition, { sessionId: submission.sessionId, storage, signal: callbackSignal, ...(options.now ? { now: options.now } : {}) }), timeoutMs, signal)
      if (decision && settled && settled.status !== 'pending' && settled.status !== 'claimed') {
        // Replay of a settled decision: answer from the recorded transcript; no lease, tool, or model call.
        const stored = memory ? await withTimeout(async callbackSignal => memory.load({ signal: callbackSignal }), timeoutMs, signal) : []
        await withTimeout(callbackSignal => session.persist(callbackSignal), timeoutMs, signal)
        const event = createSnapshotEvent({
          eventId: createId(), sessionId: submission.sessionId, turnId: submission.turnId, sequence: session.getCursor(), emittedAt: (options.now?.() ?? new Date()).toISOString(),
          ...(submission.correlation === undefined ? {} : { correlation: submission.correlation }),
          messages: stored.length > 0 ? stored : settled.messages, status: 'complete', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          capabilities: [ACTION_DECIDE_CAPABILITY],
        })
        return new Response(`${encodeTurnEvent(event)}\n`, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
      }
      if (!(await withTimeout(callbackSignal => session.claimTurn(submission.turnId, leaseMs, callbackSignal), timeoutMs, signal))) {
        // A decision that lost the turn lease to the request deciding the same action is already decided, not merely busy.
        if (decision && (await withTimeout(() => decisionStore!.get(decision.token), timeoutMs, signal))?.status !== 'pending') return fail(409, 'ACTION_ALREADY_DECIDED', 'This action was already decided.')
        return json({ version: 1, code: 'SESSION_BUSY', message: 'Another turn is active for this session.', retryable: true }, 409)
      }
      const releaseClaim = async (): Promise<void> => {
        const releaseSignal = AbortSignal.timeout(cleanupTimeoutMs)
        await withTimeout(callbackSignal => session.releaseTurn(submission.turnId, 'indeterminate', callbackSignal), cleanupTimeoutMs, releaseSignal)
      }
      cleanupAfterClaim = releaseClaim
      const resolveCost = options.cost
      const cost = resolveCost ? await withTimeout(callbackSignal => Promise.resolve(resolveCost(context, submission.sessionId, callbackSignal)), timeoutMs, signal) : undefined
      const reservationId = `${submission.sessionId}:${submission.turnId}`
      let quota: { readonly utilization: number; readonly warning: boolean } | undefined
      if (cost) {
        const reserved = await withTimeout(() => cost.store.reserve({ tenant: cost.tenant, reservationId, amountUsd: cost.reserveUsd, ...(cost.capUsd === undefined ? {} : { capUsd: cost.capUsd }) }), timeoutMs, signal)
        if (!reserved.ok) return fail(402, 'QUOTA_EXCEEDED', 'The usage limit for this plan has been reached.')
        const utilization = reserved.window.utilization
        if (utilization !== undefined) quota = { utilization, warning: utilization >= (cost.warnAt ?? 0.8) }
      }
      /** Commit the real spend of a turn that finished; release the hold of one that failed or was cut short. */
      const settleCost = async (state: ChatState | undefined): Promise<void> => {
        if (!cost) return
        if (!state || state.status === 'error' || state.error) { await cost.store.release({ tenant: cost.tenant, reservationId }); return }
        const actualUsd = cost.priceUsd(state.usage)
        await cost.store.commit({ tenant: cost.tenant, reservationId, actualUsd, usage: [{
          model: cost.model, promptTokens: state.usage.promptTokens, completionTokens: state.usage.completionTokens, costUsd: actualUsd,
          ...(cost.source === undefined ? {} : { source: cost.source }), ...(cost.fallback === undefined ? {} : { fallback: cost.fallback }),
        }] })
      }
      cleanupAfterClaim = async () => { await settleCost(undefined).catch(() => undefined); await releaseClaim() }

      const loaded = memory ? await withTimeout(async callbackSignal => memory.load({ signal: callbackSignal }), timeoutMs, signal) : definition.chat.initialMessages ?? []
      const messages: readonly Message[] = loaded.length > 0 ? loaded : definition.chat.initialMessages ?? []
      const { memory: _memory, ...chat } = definition.chat
      const adapter = uploads && tenantId !== undefined ? deliverUploadParts(chat.adapter, uploads, tenantId, submission.sessionId, signal) : chat.adapter
      const controller = createChatController(session.updateChat({ ...chat, adapter, initialMessages: [...messages], ...(decisionStore ? { decisionStore } : {}) }))
      const capabilities = [...(decisionStore ? [ACTION_DECIDE_CAPABILITY] : []), ...(uploads ? [TURN_PARTS_CAPABILITY] : [])]
      let announcedCapabilities = false
      let failure: unknown
      let pending: ChatState | undefined
      const waiters: (() => void)[] = []
      const notify = (): void => { for (const resume of waiters.splice(0)) resume() }
      const changed = (): Promise<void> => new Promise<void>(resolve => { waiters.push(resolve) })
      let done = false
      let closed = false
      const push = (): void => {
        const state = controller.getState()
        pending = { ...state, messages: [...state.messages], usage: { ...state.usage } }
        notify()
      }
      const unsubscribe = controller.subscribe(push)
      let cleanup: (stop: boolean) => Promise<void> = async () => undefined
      const abort = (): void => { controller.stop(); void cleanup(true).catch(() => undefined) }
      signal.addEventListener('abort', abort, { once: true })
      const send = (decision ? controller.decide(decision.token, decision.decision, decision.reason).then(() => undefined) : controller.send(content))
        .catch((error: unknown) => { if (decision) failure = decisionError(error) })
        .finally(() => { done = true; notify() })

      cleanup = async (stop: boolean): Promise<void> => {
        if (closed) return
        closed = true
        unsubscribe(); signal.removeEventListener('abort', abort)
        if (stop && !signal.aborted) controller.stop()
        const settleSignal = AbortSignal.timeout(cleanupTimeoutMs)
        await withTimeout(() => send, cleanupTimeoutMs, settleSignal).catch(() => undefined)
        const finished = !stop && failure === undefined && !signal.aborted
        if (cost) await withTimeout(() => settleCost(finished ? controller.getState() : undefined), cleanupTimeoutMs, AbortSignal.timeout(cleanupTimeoutMs)).catch(() => undefined)
        const saveSignal = AbortSignal.timeout(cleanupTimeoutMs)
        let outcome: 'completed' | 'indeterminate' = 'completed'
        try { await withTimeout(callbackSignal => Promise.resolve(memory?.save(controller.getState().messages, { signal: callbackSignal })), cleanupTimeoutMs, saveSignal) }
        catch (error) { outcome = 'indeterminate'; throw error }
        finally {
          const releaseSignal = AbortSignal.timeout(cleanupTimeoutMs)
          await withTimeout(callbackSignal => session.releaseTurn(submission.turnId, outcome, callbackSignal), cleanupTimeoutMs, releaseSignal)
        }
      }
      cleanupAfterClaim = () => cleanup(true)
      const diagnosticLine = (code: string, message: string): Uint8Array => {
        const event = TurnEventSchema.parse({
          protocol: 'agentskit.chat.turn', version: 1, eventId: createId(), sessionId: submission.sessionId, turnId: submission.turnId,
          sequence: session.getCursor() + 1, emittedAt: (options.now?.() ?? new Date()).toISOString(), event: 'server.turn.diagnostic',
          ...(submission.correlation === undefined ? {} : { correlation: submission.correlation }),
          payload: { version: 1, code, message, retryable: true },
        })
        return encoder.encode(`${encodeTurnEvent(event)}\n`)
      }

      if (decision) {
        // A decision rejected before it changed any state is an HTTP error, not a stream.
        while (!pending && !done && !signal.aborted) await changed()
        if (failure !== undefined && !pending) throw failure
      }
      const body = new ReadableStream<Uint8Array>({
        async pull(stream) {
          try {
            while (!pending && !done && !signal.aborted) await changed()
            if (signal.aborted) {
              stream.enqueue(diagnosticLine(deadline.aborted ? 'SERVER_TIMEOUT' : 'REQUEST_CANCELLED', deadline.aborted ? 'The chat request timed out.' : 'The chat request was cancelled.'))
              await cleanup(true)
              stream.close()
              return
            }
            if (pending) {
              const state = pending; pending = undefined
              await withTimeout(callbackSignal => session.persist(callbackSignal), timeoutMs, signal)
              const event = createSnapshotEvent({
                eventId: createId(), sessionId: submission.sessionId, turnId: submission.turnId, sequence: session.getCursor(), emittedAt: (options.now?.() ?? new Date()).toISOString(),
                ...(submission.correlation === undefined ? {} : { correlation: submission.correlation }),
                messages: state.messages, status: snapshotStatus(state), usage: state.usage, ...(decision ? {} : { lineage: { operation: 'submit' as const } }),
                ...(!announcedCapabilities ? { capabilities, ...(quota ? { quota } : {}) } : {}),
                ...(state.error ? { error: { version: 1, code: 'CHAT_TURN_FAILED', message: 'The chat turn failed.', retryable: true } } : {}),
              })
              announcedCapabilities = true
              stream.enqueue(encoder.encode(`${encodeTurnEvent(event)}\n`))
              return
            }
            if (failure !== undefined) throw failure
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
      const response = new Response(body, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
      cleanupAfterClaim = undefined
      return response
    } catch (error) {
      await cleanupAfterClaim?.().catch(() => undefined)
      if (signal.aborted) return json({ version: 1, code: deadline.aborted ? 'SERVER_TIMEOUT' : 'REQUEST_CANCELLED', message: deadline.aborted ? 'The chat request timed out.' : 'The chat request was cancelled.', retryable: true }, deadline.aborted ? 408 : 499)
      const safe = safeError(error)
      return json(safe.diagnostic, safe.status)
    }
  }
}
