import { parseCassette, serializeCassette, type Cassette } from '@agentskit/eval/replay'
import type { ActionPolicyTrace, TurnTrace } from '@agentskit/chat'
import { z } from 'zod'

const IdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)
const DetailSchema = z.record(z.string().min(1).max(128), z.json()).refine(value => JSON.stringify(value).length <= 65_536, 'Trace detail exceeds 64 KiB.')
export const TraceCategorySchema = z.enum(['route', 'agent', 'repair', 'fallback', 'policy', 'action', 'lifecycle'])
export const ApplicationTraceRecordSchema = z.object({
  id: IdSchema, sequence: z.number().int().nonnegative(), at: z.iso.datetime(), category: TraceCategorySchema,
  parentId: IdSchema.optional(), detail: DetailSchema,
}).strict().readonly()

export type TraceCategory = z.infer<typeof TraceCategorySchema>
export type ApplicationTraceRecord = z.infer<typeof ApplicationTraceRecordSchema>

export interface TraceCaptureOptions {
  readonly redactFields?: readonly string[]
  readonly now?: () => Date
}

export interface AppendTraceInput {
  readonly category: TraceCategory
  readonly detail: Readonly<Record<string, unknown>>
  readonly parentId?: string
  readonly at?: string
}

export interface TraceCapture {
  append(input: AppendTraceInput): ApplicationTraceRecord
  snapshot(): readonly ApplicationTraceRecord[]
}

const redact = (value: unknown, fields: ReadonlySet<string>): unknown => {
  if (Array.isArray(value)) return value.map(item => redact(item, fields))
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fields.has(key) ? '[REDACTED]' : redact(item, fields)]))
  return value
}

const deepFreeze = <T>(value: T): T => {
  if (Array.isArray(value)) { value.forEach(deepFreeze); return Object.freeze(value) }
  if (value !== null && typeof value === 'object') { Object.values(value).forEach(deepFreeze); return Object.freeze(value) }
  return value
}

export const createTraceCapture = (options: TraceCaptureOptions = {}): TraceCapture => {
  const fields = new Set(options.redactFields ?? [])
  const records: ApplicationTraceRecord[] = []
  return {
    append: input => {
      if (input.parentId !== undefined && !records.some(record => record.id === input.parentId)) throw new Error('Trace parent must refer to an earlier record.')
      const sequence = records.length
      const detail = DetailSchema.parse(redact(DetailSchema.parse(input.detail), fields))
      const record = ApplicationTraceRecordSchema.parse({ id: `trace-${sequence}`, sequence, at: input.at ?? (options.now?.() ?? new Date()).toISOString(), category: input.category, ...(input.parentId === undefined ? {} : { parentId: input.parentId }), detail })
      records.push(record)
      return record
    },
    snapshot: () => Object.freeze(records.map(record => deepFreeze({ ...record, detail: structuredClone(record.detail) }))),
  }
}

export const captureTurnTrace = (capture: TraceCapture, trace: TurnTrace, parentId?: string): ApplicationTraceRecord => capture.append({
  category: trace.kind === 'deterministic' ? 'route' : trace.kind === 'agentic' ? 'agent' : trace.kind === 'repaired' ? 'repair' : 'fallback',
  detail: { kind: trace.kind, ...(trace.routeId === undefined ? {} : { routeId: trace.routeId }), fromState: trace.fromState, toState: trace.toState },
  ...(parentId === undefined ? {} : { parentId }),
})

export const captureActionPolicyTrace = (capture: TraceCapture, trace: ActionPolicyTrace, parentId?: string): ApplicationTraceRecord => capture.append({
  category: 'policy', at: new Date(trace.timestamp).toISOString(),
  detail: { policyTraceId: trace.id, toolCallId: trace.toolCallId, action: trace.action, phase: trace.phase, decision: trace.decision, reason: trace.reason, requiredCapabilities: [...trace.requiredCapabilities] },
  ...(parentId === undefined ? {} : { parentId }),
})

export const ReplayFixtureSchema = z.object({
  protocol: z.literal('agentskit.chat.replay'), version: z.literal(1), cassette: z.unknown(), traces: z.array(ApplicationTraceRecordSchema).max(10_000),
}).strict().readonly().superRefine((fixture, context) => {
  const prior = new Set<string>()
  fixture.traces.forEach((trace, index) => {
    if (trace.sequence !== index) context.addIssue({ code: 'custom', path: ['traces', index, 'sequence'], message: 'Trace sequence must be contiguous.' })
    if (prior.has(trace.id)) context.addIssue({ code: 'custom', path: ['traces', index, 'id'], message: 'Trace ids must be unique.' })
    if (trace.parentId !== undefined && !prior.has(trace.parentId)) context.addIssue({ code: 'custom', path: ['traces', index, 'parentId'], message: 'Trace parent must precede its child.' })
    prior.add(trace.id)
  })
})
export type ReplayFixture = Omit<z.infer<typeof ReplayFixtureSchema>, 'cassette'> & { readonly cassette: Cassette }

export const createReplayFixture = (cassette: Cassette, traces: readonly ApplicationTraceRecord[]): ReplayFixture => {
  const upstream = parseCassette(serializeCassette(cassette))
  const envelope = ReplayFixtureSchema.parse({ protocol: 'agentskit.chat.replay', version: 1, cassette: upstream, traces })
  return { ...envelope, cassette: upstream }
}

export const serializeReplayFixture = (fixture: ReplayFixture): string => JSON.stringify(createReplayFixture(fixture.cassette, fixture.traces), null, 2)

export const parseReplayFixture = (input: string): ReplayFixture => {
  const envelope = ReplayFixtureSchema.parse(JSON.parse(input) as unknown)
  const cassette = parseCassette(JSON.stringify(envelope.cassette))
  return { ...envelope, cassette }
}

export const SemanticOutcomeSchema = z.object({ turnId: IdSchema, kind: IdSchema, value: z.json().optional() }).strict().readonly()
export const RendererOutcomeSchema = z.object({ renderer: IdSchema, outcomes: z.array(SemanticOutcomeSchema).max(10_000) }).strict().readonly()
export type SemanticOutcome = z.infer<typeof SemanticOutcomeSchema>
export type RendererOutcome = z.infer<typeof RendererOutcomeSchema>
export interface ParityMismatch { readonly renderer: string; readonly turnId: string; readonly expected?: SemanticOutcome; readonly actual?: SemanticOutcome }
export interface RendererParityReport { readonly ok: boolean; readonly baseline: string; readonly renderers: readonly string[]; readonly mismatches: readonly ParityMismatch[] }

const canonical = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item !== null && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item)

export const compareRendererOutcomes = (input: readonly RendererOutcome[]): RendererParityReport => {
  const renderers = z.array(RendererOutcomeSchema).min(2).parse(input)
  if (new Set(renderers.map(item => item.renderer)).size !== renderers.length) throw new Error('Renderer ids must be unique.')
  for (const item of renderers) if (new Set(item.outcomes.map(outcome => outcome.turnId)).size !== item.outcomes.length) throw new Error('Turn ids must be unique per renderer.')
  const baseline = renderers[0]!
  const expected = new Map(baseline.outcomes.map(outcome => [outcome.turnId, outcome]))
  const turnIds = new Set(renderers.flatMap(renderer => renderer.outcomes.map(outcome => outcome.turnId)))
  const mismatches: ParityMismatch[] = []
  for (const renderer of renderers.slice(1)) {
    const actual = new Map(renderer.outcomes.map(outcome => [outcome.turnId, outcome]))
    for (const turnId of turnIds) {
      const left = expected.get(turnId); const right = actual.get(turnId)
      if (canonical(left) !== canonical(right)) mismatches.push({ renderer: renderer.renderer, turnId, ...(left === undefined ? {} : { expected: left }), ...(right === undefined ? {} : { actual: right }) })
    }
  }
  return Object.freeze({ ok: mismatches.length === 0, baseline: baseline.renderer, renderers: Object.freeze(renderers.map(item => item.renderer)), mismatches: Object.freeze(mismatches) })
}
