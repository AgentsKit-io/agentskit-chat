import { createChatController, type AdapterFactory, type Message, type ToolCall, type ToolDefinition } from '@agentskit/core'
import { createActionConfirmation, defineChat, type ActionConfirmation } from '@agentskit/chat'
import { z } from 'zod'

export type InvestigationMode = 'agentic' | 'deterministic'
export type TraceEvent = Readonly<{
  id: string; name: string; kind: 'context' | 'decision' | 'tool' | 'validation' | 'policy' | 'outcome'
  status: 'running' | 'ok' | 'error' | 'waiting'; summary: string; elapsedMs: number
  durationMs?: number; evidence: Readonly<Record<string, unknown>>
}>
export type InvestigationSnapshot = Readonly<{
  id: string; mode: InvestigationMode; status: 'ready' | 'running' | 'approval' | 'recovered' | 'escalated' | 'error'
  paused: boolean; events: readonly TraceEvent[]; pending?: ToolCall
}>
const inputSchema = z.object({ service: z.literal('checkout-api'), target: z.literal('v2.8.3').optional() }).strict()
const toolsOrder = ['metrics.query', 'logs.search', 'deploy.get', 'deploy.get', 'deploy.audit']
const allCalls = (messages: Message[]) => messages.flatMap(m => m.toolCalls ?? [])

/** A fixture adapter, not an LLM. The agentic branch selects from observed tool outcomes. */
export function createIncidentAdapter(mode: InvestigationMode, onRoute: (tool: string) => void, checkpoint: () => Promise<void>): AdapterFactory {
  return { createSource: ({ messages }) => {
    let aborted = false
    return { abort() { aborted = true }, async *stream() {
      await checkpoint()
      if (aborted) return
      const calls = allCalls(messages)
      const rollback = calls.find(c => c.name === 'rollback.execute')
      let tool: string | undefined
      if (rollback?.status === 'complete') tool = calls.some(c => c.name === 'health.check') ? undefined : 'health.check'
      else if (!rollback) {
        if (mode === 'deterministic') tool = toolsOrder[calls.length]
        else if (!calls.some(c => c.name === 'metrics.query')) tool = 'metrics.query'
        else if (!calls.some(c => c.name === 'logs.search')) tool = 'logs.search'
        else if (calls.filter(c => c.name === 'deploy.get' && c.status === 'error').length < 2) tool = 'deploy.get'
        else if (!calls.some(c => c.name === 'deploy.audit')) tool = 'deploy.audit'
      }
      if (tool) {
        onRoute(tool)
        yield { type: 'tool_call' as const, toolCall: { id: `call-${calls.length + 1}`, name: tool, args: JSON.stringify({ service: 'checkout-api' }) } }
      } else yield { type: 'text' as const, content: rollback?.status === 'complete' ? 'Health evidence is available for validation.' : 'Investigation evidence collected. Await host policy.' }
      yield { type: 'done' as const }
    } }
  } }
}

export function createInvestigation(options: { mode: InvestigationMode; paceMs?: number; adapter?: AdapterFactory }) {
  const id = `run-${crypto.randomUUID()}`
  const began = performance.now()
  let state: InvestigationSnapshot = { id, mode: options.mode, status: 'ready', paused: false, events: [] }
  let disposed = false
  let pace = options.paceMs ?? 1400
  let approval: ActionConfirmation | undefined
  let adapterProposal: ToolCall | undefined
  let approved = false
  let deployed = false
  let resolving = false
  const listeners = new Set<() => void>()
  const notify = () => { if (!disposed) for (const listener of listeners) listener() }
  const update = (patch: Partial<InvestigationSnapshot>) => { if (!disposed) { state = { ...state, ...patch }; notify() } }
  const event = (name: string, kind: TraceEvent['kind'], status: TraceEvent['status'], summary: string, evidence: Record<string, unknown>, durationMs?: number) => {
    if (disposed) return
    const entry: TraceEvent = { id: `event-${state.events.length + 1}`, name, kind, status, summary, evidence, elapsedMs: Math.round(performance.now() - began), ...(durationMs === undefined ? {} : { durationMs }) }
    update({ events: [...state.events, entry] })
  }
  const checkpoint = async () => {
    let remaining = pace
    while (!disposed && (remaining > 0 || state.paused)) {
      await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(remaining, 1))))
      if (!state.paused) remaining -= 50
    }
    if (disposed) throw new Error('Recording stopped')
  }
  const results: Record<string, Record<string, unknown>> = {
    'metrics.query': { service: 'checkout-api', errorRate: '18.4%', baseline: '0.2%', window: '5 minutes', evidenceRef: 'metric-01' },
    'logs.search': { service: 'checkout-api', category: 'connection_pool_exhausted', matched: 184, payload: '[REDACTED]', evidenceRef: 'logs-01' },
    'deploy.audit': { service: 'checkout-api', current: 'v2.8.4', previous: 'v2.8.3', fresh: true, evidenceRef: 'deploy-hint-01' },
    'rollback.execute': { service: 'checkout-api', target: 'v2.8.3', simulated: true },
    'health.check': { service: 'checkout-api', errorRate: '0.2%', healthy: true, evidenceRef: 'health-01' },
  }
  const definitions: ToolDefinition[] = [...Object.keys(results), 'deploy.get'].map(name => ({
    name, description: `Fictional incident tool: ${name}`, requiresConfirmation: name === 'rollback.execute',
    schema: { type: 'object', properties: { service: { type: 'string', enum: ['checkout-api'] }, target: { type: 'string', enum: ['v2.8.3'] } }, required: ['service'], additionalProperties: false },
    async execute(args) {
      inputSchema.parse(args)
      if (name === 'rollback.execute' && (!approved || args.target !== 'v2.8.3')) throw new Error('Host approval required')
      event(name, 'tool', 'running', name === 'rollback.execute' ? 'Executing the approved simulation.' : 'Calling the fixture tool.', { input: args })
      const start = performance.now()
      await checkpoint()
      const duration = Math.round(performance.now() - start)
      if (name === 'deploy.get') {
        event(name, 'tool', 'error', 'Injected timeout. This failure remains in the trace.', { input: args, error: 'TIMEOUT', retryBudget: 1 }, duration)
        throw new Error('Injected TIMEOUT in deploy.get')
      }
      if (name === 'rollback.execute') deployed = true
      const result = results[name]!
      event(name, 'tool', 'ok', name === 'deploy.audit' ? 'Alternate deployment evidence recovered.' : 'Fixture response received.', { input: args, output: result }, duration)
      const valid = result.service === 'checkout-api' && (name !== 'health.check' || deployed)
      event(`${name}.validate`, 'validation', valid ? 'ok' : 'error', valid ? 'Service, scope and fixture evidence validated.' : 'Recovery cannot be verified before rollback.', { accepted: valid, evidenceRef: result.evidenceRef ?? 'approved-action' })
      if (!valid) throw new Error('Invalid evidence')
      return result
    },
  }))
  const route = (tool: string) => event('route.selected', 'decision', 'ok', `${options.mode === 'agentic' ? 'Scripted adapter selected' : 'Runbook selected'} ${tool}`, { route: tool, source: options.mode === 'agentic' ? 'scripted-adapter' : 'fixed-runbook', contextVersion: 'incident-snapshot-v7' })
  const adapter = options.adapter ?? createIncidentAdapter(options.mode, route, checkpoint)
  const definition = defineChat({ id: 'conf42-observability', chat: {
    adapter, tools: definitions, maxToolIterations: 10,
    systemPrompt: 'Investigate only checkout-api. Use read-only tools. Production changes require host approval. Never claim recovery without health evidence.',
    validateArgs: (_schema, args) => ({ valid: inputSchema.safeParse(args).success }),
    authorizeToolCall: call => {
      if (disposed || !inputSchema.safeParse(call.args).success) return { allowed: false, reason: 'Invalid scope' }
      return { allowed: true }
    },
  } })
  const controller = createChatController(definition.chat)
  const confirmations = createActionConfirmation({ sessionId: id, chat: controller, ttlMs: 30 * 60_000 })
  const finish = () => {
    if (disposed) return
    const healthy = allCalls(controller.getState().messages).some(c => c.name === 'health.check' && c.status === 'complete')
    if (healthy && deployed) { event('recovery.verified', 'outcome', 'ok', 'Checkout API recovered in the simulation.', { service: 'checkout-api', evidenceRef: 'health-01', errorRate: '0.2%' }); update({ status: 'recovered' }) }
    else { event('recovery.unverified', 'outcome', 'error', 'Escalate: recovery was not verified.', { verified: false }); update({ status: 'escalated' }) }
  }
  return {
    snapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    pause(paused: boolean) { update({ paused }) },
    setPace(ms: number) { pace = Math.max(0, Math.min(5000, ms)) },
    async start() {
      if (state.status !== 'ready' || disposed) return
      update({ status: 'running' })
      event('context.loaded', 'context', 'ok', 'The investigation starts with versioned evidence.', { instructions: 'runbook-v3', context: 'incident-snapshot-v7', service: 'checkout-api', model: 'mock / no LLM' })
      try {
        await controller.send('Checkout API errors increased after deployment. Investigate and propose the safest next step.')
        if (disposed) return
        const audit = allCalls(controller.getState().messages).find(c => c.name === 'deploy.audit' && c.status === 'complete')
        if (!audit) { finish(); return }
        // Preserve an adapter-originated proposal: approve its native call ID rather
        // than creating an orphaned second rollback request.
        adapterProposal = allCalls(controller.getState().messages).find(c => c.name === 'rollback.execute' && c.status === 'requires_confirmation')
        if (!adapterProposal) approval = await confirmations.propose({ name: 'rollback.execute', input: { service: 'checkout-api', target: 'v2.8.3' } })
        const pending = adapterProposal ?? allCalls(controller.getState().messages).find(c => c.id === approval?.toolCallId)
        event('approval.required', 'policy', 'waiting', 'The agent can propose. Only you can approve.', { target: 'v2.8.3', service: 'checkout-api', simulated: true, evidenceRef: 'deploy-hint-01' })
        update({ status: 'approval', ...(pending ? { pending } : {}) })
      } catch { if (!disposed) { event('execution.failed', 'outcome', 'error', 'Execution stopped safely. Replay to start a new run.', { recoverable: true }); update({ status: 'error' }) } }
    },
    async approve() {
      if ((!approval && !adapterProposal) || state.status !== 'approval' || resolving || disposed) return
      resolving = true; approved = true
      update({ status: 'running', paused: false })
      event('approval.granted', 'policy', 'ok', 'Presenter approved the scoped, simulated rollback.', { actor: 'presenter-local', target: 'v2.8.3', approvalRef: adapterProposal?.id ?? approval?.toolCallId })
      try { if (adapterProposal) await controller.approve(adapterProposal.id); else if (approval) await confirmations.approve(approval.token, id); finish() }
      catch { update({ status: 'error' }) }
      finally { resolving = false }
    },
    async reject() {
      if ((!approval && !adapterProposal) || state.status !== 'approval' || resolving || disposed) return
      resolving = true
      try { if (adapterProposal) await controller.deny(adapterProposal.id, 'Presenter denied'); else if (approval) await confirmations.reject(approval.token, id, 'Presenter denied'); event('approval.denied', 'policy', 'ok', 'No rollback executed. Escalate to the service owner.', { executed: false }); update({ status: 'escalated' }) }
      catch { update({ status: 'error' }) }
      finally { resolving = false }
    },
    exportTrace: () => JSON.stringify({ schemaVersion: 1, traceType: 'application-demo', fixture: 'incident-snapshot-v7', modelTokens: null, modelCost: null, ...state, pending: undefined }, null, 2),
    dispose() { disposed = true; controller.stop(); listeners.clear() },
  }
}
