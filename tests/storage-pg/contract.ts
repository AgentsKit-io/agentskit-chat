import { resumeChatSession, SessionConflictError } from '@agentskit/chat'
import type { ChatDefinition, SessionStorage } from '@agentskit/chat'
type AdapterFactory = ChatDefinition['chat']['adapter']
import { createChatHandler } from '@agentskit/chat/server'
import { SessionSnapshotSchema } from '@agentskit/chat/protocol'

const check = (value: unknown, criterion: string): void => { if (!value) throw new Error(criterion) }
const snapshot = (sessionId: string, cursor: number) => SessionSnapshotSchema.parse({
  protocol: 'agentskit.chat.session', version: 1, sessionId, definitionId: 'contract', definitionRevision: 1,
  updatedAt: new Date().toISOString(), cursor, confirmations: [],
})

/** Same acceptance flow on a Node pool and a Worker request client; no database mocks. */
export const runSessionStorageContract = async (storage: (tenant: string) => SessionStorage): Promise<string[]> => {
  const id = `contract-${crypto.randomUUID()}`
  const a = storage('tenant-a'), b = storage('tenant-b')
  const passed: string[] = []
  try {
    check(await a.load(id) === undefined, 'empty load')
    check(await a.save(snapshot(id, 0), undefined), 'insert')
    check(!(await a.save(snapshot(id, 0), undefined)), 'duplicate insert loses')
    check(await b.load(id) === undefined, 'RF-13 cross-tenant load')
    check(!(await b.save(snapshot(id, 1), 0)), 'RF-13 cross-tenant overwrite')
    check(await b.save(snapshot(id, 0), undefined), 'RF-13 independent tenant key')
    await b.delete?.(id)
    check((await a.load(id) as { cursor: number }).cursor === 0, 'RF-13 cross-tenant delete')
    passed.push('RF-13 tenant isolation (load/save/delete; no list API)')
    for (let cursor = 0; cursor < 100; cursor++) {
      const results = await Promise.all([a.save(snapshot(id, cursor + 1), cursor), a.save(snapshot(id, cursor + 1), cursor)])
      check(results.filter(Boolean).length === 1, `RF-14 CAS race ${cursor}`)
    }
    check((await a.load(id) as { cursor: number }).cursor === 100, 'RF-14 persisted cursor')
    passed.push('RF-14 100 concurrent CAS races, exactly one winner')
    const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'text', content: 'ok' }; yield { type: 'done' } }, abort() {} }) }
    const definition = { id: 'contract', chat: { adapter } }
    const one = await resumeChatSession(definition, { sessionId: id, storage: a })
    const two = await resumeChatSession(definition, { sessionId: id, storage: a })
    const claims = await Promise.allSettled([one.claimTurn('turn-a', 10000), two.claimTurn('turn-b', 10000)])
    check(claims.filter(result => result.status === 'fulfilled' && result.value).length === 1, 'RF-15 lease single winner')
    check(claims.some(result => result.status === 'rejected' && result.reason instanceof SessionConflictError), '409 typed CAS conflict')
    const submission = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'event', sessionId: id, turnId: 'turn-c', sequence: 0,
      emittedAt: new Date().toISOString(), event: 'client.turn.submit', payload: { input: 'hello' } }
    const handler = createChatHandler({ resolveDefinition: () => definition, sessionStorage: () => a })
    const request = () => new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(submission) })
    const busy = await handler(request())
    check(busy.status === 409 && (await busy.json() as { error: { code: string } }).error.code === 'SESSION_BUSY', 'RF-15 busy handler 409')
    const winner = claims[0]?.status === 'fulfilled' ? one : two
    await winner.releaseTurn(claims[0]?.status === 'fulfilled' ? 'turn-a' : 'turn-b', 'completed')
    const recovered = await handler(request())
    check(recovered.status === 200, 'RF-15 recovery 200')
    check((await recovered.text()).includes('server.turn.snapshot'), 'real NDJSON response')
    let finish: (() => void) | undefined
    const gate = new Promise<void>(resolve => { finish = resolve })
    const slowAdapter: AdapterFactory = { createSource: () => ({ async *stream() { await gate; yield { type: 'done' } }, abort() { finish?.() } }) }
    const overlap = createChatHandler({ resolveDefinition: () => ({ id: 'contract', chat: { adapter: slowAdapter } }), sessionStorage: () => a })
    const liveRequest = (turnId: string) => new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...submission, turnId }) })
    const live = await overlap(liveRequest('live-a'))
    try {
      const competing = await overlap(liveRequest('live-b'))
      check(live.status === 200 && competing.status === 409 && (await competing.json() as { error: { code: string } }).error.code === 'SESSION_BUSY', 'RF-15 overlapping HTTP turns 200 + 409 SESSION_BUSY')
    } finally { finish?.(); await live.text() }
    passed.push('RF-15 durable lease, overlapping HTTP 200 + 409 SESSION_BUSY, release/recovery 200')
    // Force a stale writer at the actual HTTP boundary.
    const conflictHandler = createChatHandler({ resolveDefinition: () => definition, sessionStorage: () => ({ ...a, save: (next, expected, signal) => a.save(next, Math.max(0, (expected ?? 1) - 1), signal) }) })
    const conflict = await conflictHandler(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...submission, turnId: 'turn-d' }) }))
    check(conflict.status === 409 && (await conflict.json() as { error: { code: string } }).error.code === 'SESSION_CONFLICT', '409 SESSION_CONFLICT preserved')
    passed.push('409 SESSION_CONFLICT preserved at handler boundary (real stale-cursor SQL update)')
    const abort = new AbortController(); abort.abort()
    let aborted = false
    try { await a.load(id, abort.signal) } catch { aborted = true }
    check(aborted, 'aborted load')
    passed.push('pre-aborted operation rejected')
    return passed
  } finally { await a.delete?.(id); await b.delete?.(id) }
}
