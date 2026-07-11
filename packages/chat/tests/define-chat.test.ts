import { ConfigError, createChatController } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { describe, expect, it, vi } from 'vitest'

import {
  ChoiceListComponent, createActionConfirmation, createCapabilityPolicy,
  commandRoute, createChatSession, defineChat, defineComponentManifest, formatSemanticFallback, parseSemanticFallback,
  resumeChatSession,
  resolveChatSession,
  resolveChoiceListFrame,
  resolveComponentFrame,
  resolveChatTheme,
  getLifecycleTargets,
  selectChoice, withActionPolicy,
  type TurnTrace,
} from '../src/index.js'
import { validChoiceListFrame } from '../../protocol/src/fixtures.js'

const adapter: AdapterFactory = {
  createSource: () => ({
    async *stream() {
      yield { type: 'done' }
    },
    abort() {},
  }),
}

describe('defineChat', () => {
  it('preserves the definition and upstream ChatConfig reference', () => {
    const chat = { adapter }
    const definition = defineChat({ id: 'support', chat })

    expect(definition).toEqual({ id: 'support', chat })
    expect(definition.chat).toBe(chat)
  })

  it('rejects a prepared session from another definition', () => {
    const first = defineChat({ id: 'first', chat: { adapter } })
    const session = createChatSession(first, { sessionId: 'shared' })
    expect(() => resolveChatSession(defineChat({ id: 'second', chat: { adapter } }), session)).toThrow('incompatible')
  })
})

describe('lifecycle targets', () => {
  it('returns only one complete user-assistant turn', () => {
    const user = { id: 'user', role: 'user' as const, content: 'hello', status: 'complete' as const, createdAt: new Date() }
    const assistant = { id: 'assistant', role: 'assistant' as const, content: 'hi', status: 'complete' as const, createdAt: new Date() }
    expect(getLifecycleTargets([user, assistant])).toEqual({ userId: 'user', assistantId: 'assistant' })
    expect(getLifecycleTargets([user, assistant, { ...user, id: 'pending' }])).toEqual({ userId: undefined, assistantId: undefined })
    expect(getLifecycleTargets([assistant])).toEqual({ userId: undefined, assistantId: undefined })
  })
})

describe('semantic fallback', () => {
  it('validates and formats a framework-neutral fallback', () => {
    const fallback = parseSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' })
    expect(formatSemanticFallback(fallback)).toBe('[unsupported visual: chart] Revenue rose 12%.')
  })

  it('rejects empty fallback fields at the runtime boundary', () => {
    expect(() => parseSemanticFallback({ kind: '', summary: 'Missing kind.' })).toThrow()
  })
})

describe('semantic theme', () => {
  it('deep-merges valid partial tokens and rejects unknown input', () => {
    expect(resolveChatTheme({ colors: { accent: '#123456' }, spacing: { medium: 20 } })).toMatchObject({
      colors: { accent: '#123456', background: '#ffffff' }, spacing: { small: 8, medium: 20 }, fontFamily: 'system',
    })
    expect(() => resolveChatTheme({ colors: { accent: '' } })).toThrow()
    expect(() => resolveChatTheme({ colors: { accent: 'var(--brand)' } })).toThrow()
    expect(() => resolveChatTheme({ futureToken: true })).toThrow()
  })
})

describe('component manifest', () => {
  const manifest = defineComponentManifest([ChoiceListComponent])

  it('validates a registered ChoiceList and creates its semantic event', () => {
    const resolved = resolveChoiceListFrame(validChoiceListFrame, manifest)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.props).toEqual(validChoiceListFrame.props)
    expect(selectChoice(resolved.frame, 'docs')).toMatchObject({ type: 'select', choiceId: 'docs' })
  })

  it('keeps unknown and invalid component frames inert', () => {
    expect(resolveComponentFrame({ ...validChoiceListFrame, componentKey: 'future' }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_UNKNOWN' },
    })
    expect(resolveComponentFrame({ ...validChoiceListFrame, props: { prompt: '', choices: [] } }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_INVALID_PROPS' },
    })
    expect(resolveComponentFrame({ ...validChoiceListFrame, componentKey: 'constructor' }, manifest)).toMatchObject({
      ok: false, diagnostic: { code: 'COMPONENT_UNKNOWN' },
    })
  })

  it('rejects duplicate manifest keys and undeclared choices', () => {
    expect(() => defineComponentManifest([ChoiceListComponent, ChoiceListComponent])).toThrow(ConfigError)
    expect(() => selectChoice(validChoiceListFrame, 'missing')).toThrow(ConfigError)
    expect(() => selectChoice({ ...validChoiceListFrame, componentKey: 'other' }, 'docs')).toThrow(ConfigError)
    expect(() => defineComponentManifest([{ key: 'Invalid Key', propsSchema: ChoiceListComponent.propsSchema }])).toThrow(ConfigError)
  })
})

describe('typed action confirmation', () => {
  it('resolves capabilities only from trusted session context and records decisions', async () => {
    let context = { sessionId: 'session-a', capabilities: ['email.send'] as readonly string[] }
    const policy = createCapabilityPolicy({
      sessionId: 'session-a',
      getContext: () => context,
      requirements: { 'send-email': ['email.send'], 'delete-user': ['user.delete'] },
      now: () => 42,
    })
    const execute = vi.fn()
    const controller = createChatController(withActionPolicy({
      adapter,
      tools: [
        { name: 'send-email', requiresConfirmation: true, execute },
        { name: 'delete-user', requiresConfirmation: true, execute },
      ],
    }, policy))

    await expect(controller.proposeToolCall({ id: 'allowed', name: 'send-email', args: {} })).resolves.toMatchObject({ status: 'requires_confirmation' })
    await expect(controller.proposeToolCall({ id: 'denied', name: 'delete-user', args: { capabilities: ['user.delete'] } })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    context = { sessionId: 'other-session', capabilities: ['email.send', 'user.delete'] }
    await expect(controller.proposeToolCall({ id: 'confused-deputy', name: 'delete-user', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })

    expect(policy.getTrace()).toEqual([
      expect.objectContaining({ action: 'send-email', phase: 'propose', decision: 'allow', timestamp: 42 }),
      expect.objectContaining({ action: 'delete-user', phase: 'propose', decision: 'deny', reason: 'missing-capability' }),
      expect.objectContaining({ action: 'delete-user', phase: 'propose', decision: 'deny', reason: 'session-mismatch' }),
    ])
    expect(execute).not.toHaveBeenCalled()
  })

  it('rechecks revoked capability at execution and composes existing upstream policy', async () => {
    let capabilities: readonly string[] = ['write']
    const onTrace = vi.fn()
    const policy = createCapabilityPolicy({
      sessionId: 'session', getContext: () => ({ sessionId: 'session', capabilities }),
      requirements: { write: ['write'] }, onTrace,
    })
    const existing = vi.fn(() => ({ allowed: true }))
    const execute = vi.fn()
    const controller = createChatController(withActionPolicy({
      adapter, authorizeToolCall: existing,
      tools: [{ name: 'write', requiresConfirmation: true, execute }],
    }, policy))
    await controller.proposeToolCall({ id: 'revoked', name: 'write', args: {} })
    capabilities = []
    await controller.approve('revoked')

    expect(execute).not.toHaveBeenCalled()
    expect(existing).toHaveBeenCalledOnce()
    expect(onTrace).toHaveBeenCalledTimes(2)
    expect(policy.getTrace().at(-1)).toMatchObject({ phase: 'execute', decision: 'deny', reason: 'missing-capability' })
  })

  it('records the effective denial from a composed upstream policy', async () => {
    const policy = createCapabilityPolicy({
      sessionId: 'session', getContext: () => ({ sessionId: 'session', capabilities: [] }), requirements: { read: [] },
    })
    const controller = createChatController(withActionPolicy({
      adapter, authorizeToolCall: () => ({ allowed: false }), tools: [{ name: 'read', requiresConfirmation: true, execute: vi.fn() }],
    }, policy))
    await expect(controller.proposeToolCall({ id: 'denied', name: 'read', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    expect(policy.getTrace()).toEqual([expect.objectContaining({ decision: 'deny', reason: 'composed-policy-denied' })])
  })

  it('rechecks capabilities after an asynchronous composed policy', async () => {
    let capabilities: readonly string[] = ['write']
    const execute = vi.fn()
    const policy = createCapabilityPolicy({
      sessionId: 'session', getContext: () => ({ sessionId: 'session', capabilities }), requirements: { write: ['write'] },
    })
    const controller = createChatController(withActionPolicy({
      adapter,
      authorizeToolCall: async (_call, context) => {
        if (context.phase === 'execute') {
          await Promise.resolve()
          capabilities = []
        }
        return { allowed: true }
      },
      tools: [{ name: 'write', requiresConfirmation: true, execute }],
    }, policy))
    await controller.proposeToolCall({ id: 'revoked-during-policy', name: 'write', args: {} })
    await controller.approve('revoked-during-policy')
    expect(execute).not.toHaveBeenCalled()
    expect(policy.getTrace().at(-1)).toMatchObject({ phase: 'execute', decision: 'deny', reason: 'missing-capability' })
  })

  it('defaults missing context, unregistered actions, invalid policy, and trace observers safely', async () => {
    const policy = createCapabilityPolicy({
      sessionId: 'session', getContext: () => undefined, requirements: { write: [] },
      onTrace: () => { throw new Error('observer failed') },
    })
    await expect(policy.authorizeToolCall(
      { id: 'missing', name: 'write', args: {}, status: 'pending' },
      { phase: 'propose', messages: [] },
    )).resolves.toEqual({ allowed: false, reason: 'missing-context' })
    await expect(policy.authorizeToolCall(
      { id: 'unknown', name: 'unknown', args: {}, status: 'pending' },
      { phase: 'propose', messages: [] },
    )).resolves.toEqual({ allowed: false, reason: 'action-unregistered' })
    const failed = createCapabilityPolicy({
      sessionId: 'session', getContext: () => { throw new Error('secret failure') }, requirements: { write: [] },
    })
    await expect(failed.authorizeToolCall(
      { id: 'failed', name: 'write', args: {}, status: 'pending' },
      { phase: 'execute', messages: [] },
    )).resolves.toEqual({ allowed: false, reason: 'policy-failure' })
    expect(failed.getTrace()).toEqual([expect.objectContaining({ reason: 'policy-failure', decision: 'deny' })])
    const malformed = createCapabilityPolicy({
      sessionId: 'session', getContext: () => ({ sessionId: 'session', capabilities: undefined } as never), requirements: { write: [] },
    })
    await expect(malformed.authorizeToolCall(
      { id: 'malformed', name: 'write', args: {}, status: 'pending' },
      { phase: 'propose', messages: [] },
    )).resolves.toEqual({ allowed: false, reason: 'policy-failure' })
    expect(() => createCapabilityPolicy({ sessionId: '', getContext: () => undefined, requirements: {} })).toThrow()
    expect(() => createCapabilityPolicy({
      sessionId: 'session', getContext: () => undefined, requirements: { write: ['invalid capability'] },
    })).toThrow()
  })

  it('binds a validated upstream proposal and approves exactly once', async () => {
    const execute = vi.fn(() => 'done')
    const controller = createChatController({
      adapter,
      tools: [{ name: 'send-email', requiresConfirmation: true, execute, schema: { type: 'object' } }],
      validateArgs: (_schema, args) => ({ valid: typeof args.to === 'string' }),
    })
    const confirmation = createActionConfirmation({
      sessionId: 'session-a', chat: controller, now: () => 100, createId: () => 'choice-1',
    })
    const input = { to: 'ada@example.com' }
    const pending = await confirmation.propose({ name: 'send-email', input })
    input.to = 'changed@example.com'

    expect(pending).toMatchObject({
      token: 'confirm-choice-1', sessionId: 'session-a', action: 'send-email',
      input: { to: 'ada@example.com' }, toolCallId: 'app-choice-1', expiresAt: 300_100, status: 'pending',
    })
    const [first, replay] = await Promise.all([
      confirmation.approve(pending.token, 'session-a'), confirmation.approve(pending.token, 'session-a'),
    ])
    expect(first.status).toBe('approved')
    expect(replay.status).toBe('approved')
    expect(execute).toHaveBeenCalledOnce()
    expect(execute).toHaveBeenCalledWith({ to: 'ada@example.com' }, expect.anything())
  })

  it('keeps rejected, expired, invalid, and cross-session tokens inert', async () => {
    let clock = 10
    const execute = vi.fn()
    const controller = createChatController({
      adapter,
      tools: [{ name: 'delete', requiresConfirmation: true, execute, schema: { type: 'object' } }],
      validateArgs: () => ({ valid: true }),
    })
    let id = 0
    const confirmation = createActionConfirmation({
      sessionId: 'session-a', chat: controller, ttlMs: 5, now: () => clock, createId: () => `call-${++id}`,
    })
    const rejected = await confirmation.propose({ name: 'delete', input: { id: 1 } })
    await expect(confirmation.approve(rejected.token, 'session-b')).rejects.toThrow()
    expect((await confirmation.reject(rejected.token, 'session-a')).status).toBe('rejected')
    expect((await confirmation.approve(rejected.token, 'session-a')).status).toBe('rejected')

    const expired = await confirmation.propose({ name: 'delete', input: { id: 2 } })
    clock = expired.expiresAt
    expect((await confirmation.approve(expired.token, 'session-a')).status).toBe('expired')
    await expect(confirmation.approve('missing', 'session-a')).rejects.toThrow()
    expect(execute).not.toHaveBeenCalled()
  })

  it('delegates tool registration and argument validation to AgentsKit', async () => {
    const controller = createChatController({
      adapter,
      tools: [
        { name: 'confirmed', requiresConfirmation: true, execute: vi.fn(), schema: { type: 'object' } },
        { name: 'immediate', execute: vi.fn(), schema: { type: 'object' } },
      ],
      validateArgs: (_schema, args) => ({ valid: args.valid === true }),
    })
    const confirmation = createActionConfirmation({ sessionId: 'session', chat: controller })
    await expect(confirmation.propose({ name: 'missing', input: {} })).rejects.toMatchObject({ code: 'AK_TOOL_NOT_FOUND' })
    await expect(confirmation.propose({ name: 'immediate', input: {} })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(confirmation.propose({ name: 'confirmed', input: {} })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
  })

  it('keeps a record pending when upstream approval or rejection fails', async () => {
    const approve = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined)
    const deny = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined)
    let call = 0
    const confirmation = createActionConfirmation({
      sessionId: 'session',
      createId: () => `retry-${++call}`,
      chat: {
        proposeToolCall: async proposal => ({ ...proposal, status: 'requires_confirmation' }),
        approve,
        deny,
      },
    })
    const approving = await confirmation.propose({ name: 'write', input: {} })
    await expect(confirmation.approve(approving.token, 'session')).rejects.toThrow('temporary')
    expect((await confirmation.approve(approving.token, 'session')).status).toBe('approved')
    expect(approve).toHaveBeenCalledTimes(2)

    const rejecting = await confirmation.propose({ name: 'write', input: {} })
    await expect(confirmation.reject(rejecting.token, 'session')).rejects.toThrow('temporary')
    expect((await confirmation.reject(rejecting.token, 'session')).status).toBe('rejected')
    expect(deny).toHaveBeenCalledTimes(2)
  })

  it('retries transient expiry denial without persistent storage', async () => {
    let clock = 0
    const deny = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined)
    const confirmation = createActionConfirmation({
      sessionId: 'session', ttlMs: 1, now: () => clock, createId: () => 'expiry-retry',
      chat: { proposeToolCall: async proposal => ({ ...proposal, status: 'requires_confirmation' }), approve: vi.fn(), deny },
    })
    const record = await confirmation.propose({ name: 'write', input: {} })
    clock = record.expiresAt
    await expect(confirmation.approve(record.token, 'session')).rejects.toThrow('temporary')
    expect((await confirmation.approve(record.token, 'session')).status).toBe('expired')
    expect(deny).toHaveBeenCalledTimes(2)
  })

  it('keeps confirmation input isolated from tool mutation', async () => {
    const execute = vi.fn((args: Record<string, unknown>) => { args.value = 'mutated' })
    const controller = createChatController({
      adapter,
      tools: [{ name: 'mutate', requiresConfirmation: true, execute }],
    })
    const confirmation = createActionConfirmation({ sessionId: 'session', chat: controller })
    const record = await confirmation.propose({ name: 'mutate', input: { value: { nested: 'bound' } } })
    expect(() => { (record as { expiresAt: number }).expiresAt = Infinity }).toThrow()
    expect(() => { (record as { sessionId: string }).sessionId = 'other' }).toThrow()
    expect(() => { (record as { status: string }).status = 'approved' }).toThrow()
    expect(() => { (record.input.value as { nested: string }).nested = 'changed' }).toThrow()
    expect(() => { (confirmation.getByToolCall(record.toolCallId)!.input.value as { nested: string }).nested = 'changed' }).toThrow()
    await confirmation.approve(record.token, 'session')
    expect(record.input).toEqual({ value: { nested: 'bound' } })
  })

  it('rejects ids that cannot fit both canonical identifiers without truncation', async () => {
    const confirmation = createActionConfirmation({
      sessionId: 'session',
      createId: () => `a${'x'.repeat(120)}`,
      chat: { proposeToolCall: vi.fn(), approve: vi.fn(), deny: vi.fn() },
    })
    await expect(confirmation.propose({ name: 'write', input: {} })).rejects.toThrow('id is invalid')
  })
})

const request = (content: string, id = 'user-1', previous: AdapterRequest['messages'] = []): AdapterRequest => ({
  messages: [...previous, { id, role: 'user', content, status: 'complete', createdAt: new Date() }],
})

const read = async (source: ReturnType<AdapterFactory['createSource']>): Promise<StreamChunk[]> => {
  const chunks: StreamChunk[] = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  return chunks
}

describe('deterministic conversation session', () => {
  it('advances a known multi-turn flow before model dispatch', async () => {
    let agentCalls = 0
    const traces: TurnTrace[] = []
    const definition = defineChat({
      id: 'onboarding',
      chat: { adapter: { createSource: () => { agentCalls += 1; return adapter.createSource(request('agent')) } } },
      conversation: {
        initial: 'idle',
        states: {
          idle: { on: { start: 'collecting' }, actions: ['begin'] },
          collecting: { on: { finish: 'complete' }, actions: ['cancel'] },
          complete: { actions: ['restart'] },
        },
        routes: [
          commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
          commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
        ],
        onTrace: trace => traces.push(trace),
      },
    })

    const session = createChatSession(definition)
    expect(session.getConversationSnapshot()).toEqual({ state: 'idle', events: ['start'], actions: ['begin'] })
    const firstRequest = request('/start')
    expect(await read(session.chat.adapter.createSource(firstRequest))).toEqual([
      { type: 'text', content: 'What is your name?' }, { type: 'done' },
    ])
    expect(session.getConversationSnapshot()).toEqual({ state: 'collecting', events: ['finish'], actions: ['cancel'] })
    expect(await read(session.chat.adapter.createSource(request('/name Ada', 'user-2', firstRequest.messages)))).toEqual([
      { type: 'text', content: 'Welcome, Ada.' }, { type: 'done' },
    ])
    expect(session.getConversationSnapshot()).toEqual({ state: 'complete', events: [], actions: ['restart'] })
    expect(agentCalls).toBe(0)
    expect(traces.map(trace => trace.kind)).toEqual(['deterministic', 'deterministic'])
  })

  it('delegates unknown and state-disallowed input unchanged to the upstream adapter', async () => {
    const requests: AdapterRequest[] = []
    const traces: TurnTrace[] = []
    const upstream: AdapterFactory = { createSource: value => { requests.push(value); return adapter.createSource(value) } }
    const definition = defineChat({
      id: 'fallback', chat: { adapter: upstream },
      conversation: {
        initial: 'idle', states: { idle: { on: {} } },
        routes: [commandRoute({ id: 'blocked', command: '/start', event: 'start', response: () => 'blocked' })],
        onTrace: trace => traces.push(trace),
      },
    })
    const session = createChatSession(definition)
    const original = request('/start')
    await read(session.chat.adapter.createSource(original))
    expect(requests).toEqual([original])
    expect(traces).toEqual([{ kind: 'agentic', fromState: 'idle', toState: 'idle' }])
  })

  it('preserves route precedence and isolates session state', async () => {
    const definition = defineChat({
      id: 'precedence', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [
          { id: 'first', event: 'go', match: () => true, response: () => 'first' },
          { id: 'second', event: 'go', match: () => true, response: () => 'second' },
        ],
      },
    })
    const first = createChatSession(definition)
    const second = createChatSession(definition)
    expect(await read(first.chat.adapter.createSource(request('go')))).toContainEqual({ type: 'text', content: 'first' })
    expect(first.getConversationSnapshot()?.state).toBe('b')
    expect(second.getConversationSnapshot()?.state).toBe('a')
  })

  it.each(['repaired', 'fallback'] as const)('distinguishes %s route traces', async (traceKind) => {
    const traces: TurnTrace[] = []
    const session = createChatSession(defineChat({
      id: traceKind, chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: traceKind, event: 'go', traceKind, match: () => true, response: () => traceKind }],
        onTrace: trace => traces.push(trace),
      },
    }))
    await read(session.chat.adapter.createSource(request('go')))
    expect(traces[0]?.kind).toBe(traceKind)
  })

  it('returns a controller-owned error stream without committing when a route callback fails', async () => {
    const session = createChatSession(defineChat({
      id: 'failure', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: 'fail', event: 'go', match: () => true, response: () => { throw new Error('failed') } }],
      },
    }))
    expect(await read(session.chat.adapter.createSource(request('go')))).toEqual([
      { type: 'error', content: 'Deterministic route failed.' },
    ])
    expect(session.getConversationSnapshot()?.state).toBe('a')
  })

  it('keeps deterministic retry and regenerate off the model adapter', async () => {
    let agentCalls = 0
    const definition = defineChat({
      id: 'replay',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} },
        routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })],
      },
    })
    const session = createChatSession(definition)
    const controller = createChatController(session.chat)
    await controller.send('/start')
    await controller.retry()
    await controller.regenerate()
    expect(controller.getState().messages.at(-1)?.content).toBe('Started')
    expect(session.getConversationSnapshot()?.state).toBe('complete')
    expect(agentCalls).toBe(0)
  })

  it('recomputes state when a deterministic user turn is edited', async () => {
    let agentCalls = 0
    const definition = defineChat({
      id: 'edit',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} },
        routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })],
      },
    })
    const session = createChatSession(definition)
    const controller = createChatController(session.chat)
    await controller.send('/start')
    const userId = controller.getState().messages.find(message => message.role === 'user')!.id
    await controller.edit(userId, 'changed')
    expect(agentCalls).toBe(1)
    expect(session.getConversationSnapshot()?.state).toBe('idle')
  })

  it('drops cached decisions for turns removed from upstream history', async () => {
    let secondRuns = 0
    const session = createChatSession(defineChat({
      id: 'truncate', chat: { adapter },
      conversation: {
        initial: 'a', states: { a: { on: { one: 'b' } }, b: { on: { two: 'c' } }, c: {} },
        routes: [
          commandRoute({ id: 'one', command: '/one', event: 'one', response: () => 'one' }),
          commandRoute({ id: 'two', command: '/two', event: 'two', response: () => `two-${++secondRuns}` }),
        ],
      },
    }))
    const first = request('/one', 'user-1')
    await read(session.chat.adapter.createSource(first))
    await read(session.chat.adapter.createSource(request('/two', 'user-2', first.messages)))

    await read(session.chat.adapter.createSource(request('edited', 'user-1')))
    const restarted = request('/one', 'user-3')
    await read(session.chat.adapter.createSource(restarted))
    const replayedId = await read(session.chat.adapter.createSource(request('/two', 'user-2', restarted.messages)))
    expect(replayedId).toContainEqual({ type: 'text', content: 'two-2' })
  })

  it('updates from a compiled config without recursive adapter wrapping', async () => {
    let agentCalls = 0
    const traces: TurnTrace[] = []
    const session = createChatSession(defineChat({
      id: 'compiled-update',
      chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'idle', states: { idle: {} }, routes: [],
        onTrace: trace => traces.push(trace),
      },
    }))
    const updated = session.updateChat({ ...session.chat, systemPrompt: 'updated' })
    await read(updated.adapter.createSource(request('unknown')))
    expect(agentCalls).toBe(1)
    expect(traces).toHaveLength(1)
  })

  it('isolates throwing sync and async trace sinks from dispatch', async () => {
    for (const onTrace of [
      () => { throw new Error('sync') },
      () => Promise.reject(new Error('async')),
    ]) {
      const session = createChatSession(defineChat({
        id: 'trace-failure', chat: { adapter },
        conversation: {
          initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
          routes: [{ id: 'go', event: 'go', match: () => true, response: () => 'ok' }],
          onTrace,
        },
      }))
      expect(await read(session.chat.adapter.createSource(request('go')))).toContainEqual({ type: 'text', content: 'ok' })
      expect(session.getConversationSnapshot()?.state).toBe('b')
    }
  })

  it('turns a throwing matcher into an error stream without model dispatch', async () => {
    let agentCalls = 0
    const session = createChatSession(defineChat({
      id: 'match-failure', chat: { adapter: { createSource: value => { agentCalls += 1; return adapter.createSource(value) } } },
      conversation: {
        initial: 'a', states: { a: { on: { go: 'b' } }, b: {} },
        routes: [{ id: 'go', event: 'go', match: () => { throw new Error('failed') }, response: () => 'never' }],
      },
    }))
    expect(await read(session.chat.adapter.createSource(request('go')))).toEqual([
      { type: 'error', content: 'Deterministic route failed.' },
    ])
    expect(agentCalls).toBe(0)
    expect(session.getConversationSnapshot()?.state).toBe('a')
  })

  it.each([
    { initial: 'missing', states: { idle: {} }, routes: [] },
    { initial: '', states: { '': {} }, routes: [] },
    { initial: 'idle', states: { idle: { on: { go: 'missing' } } }, routes: [] },
    { initial: 'idle', states: { idle: {} }, routes: [{ id: '', event: 'go', match: () => true, response: () => '' }] },
    { initial: 'idle', states: { idle: {} }, routes: [
      { id: 'same', event: 'go', match: () => true, response: () => '' },
      { id: 'same', event: 'go', match: () => true, response: () => '' },
    ] },
    { initial: 'idle', states: { idle: {} }, routes: [
      { id: 'route', event: 'go', states: ['missing'], match: () => true, response: () => '' },
    ] },
  ])('rejects an invalid machine before dispatch', (conversation) => {
    expect(() => createChatSession(defineChat({ id: 'invalid', chat: { adapter }, conversation }))).toThrow(ConfigError)
  })

  it('rejects an empty exact command', () => {
    expect(() => commandRoute({ id: 'empty', command: '', event: 'go', response: () => '' })).toThrow(ConfigError)
  })

  it('persists application metadata and resumes deterministic state without replay', async () => {
    let stored: unknown
    const storage = { load: async () => stored, save: async (snapshot: unknown) => { stored = structuredClone(snapshot); return true } }
    const definition = defineChat({
      id: 'persistent', revision: 2, chat: { adapter },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'active' } }, active: {} },
        routes: [{ id: 'start', event: 'start', match: input => input === '/start', response: () => 'started' }],
      },
    })
    const first = createChatSession(definition, { sessionId: 'shared', storage, now: () => new Date('2026-07-11T00:00:00Z') })
    await read(first.chat.adapter.createSource(request('/start', 'user-1')))
    await first.persist()

    const resumed = await resumeChatSession(definition, { sessionId: 'shared', storage })
    expect(resumed.sessionId).toBe('shared')
    expect(resumed.getConversationSnapshot()?.state).toBe('active')
    expect(await read(resumed.chat.adapter.createSource(request('/start', 'user-1')))).toContainEqual({ type: 'text', content: 'started' })
  })

  it('persists decision removal when an edited turn becomes agentic', async () => {
    let stored: import('../../protocol/src/index.js').SessionSnapshot | undefined
    const storage = {
      load: () => stored,
      save: (snapshot: import('../../protocol/src/index.js').SessionSnapshot, expected: number | undefined) => {
        if (stored?.cursor !== expected) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    const definition = defineChat({ id: 'editing', chat: { adapter }, conversation: {
      initial: 'idle', states: { idle: { on: { start: 'active' } }, active: {} },
      routes: [{ id: 'start', event: 'start', match: input => input === '/start', response: () => 'started' }],
    } })
    const session = createChatSession(definition, { sessionId: 'edit-session', storage })
    await read(session.chat.adapter.createSource(request('/start', 'user-1')))
    await session.persist()
    await read(session.chat.adapter.createSource(request('changed', 'user-1')))
    await session.persist()
    const resumed = await resumeChatSession(definition, { sessionId: 'edit-session', storage })
    expect(resumed.getConversationSnapshot()?.state).toBe('idle')
    expect(stored?.conversation?.decisions).toEqual([])
  })

  it('rejects corrupt or incompatible stored sessions before hydration', async () => {
    const definition = defineChat({ id: 'expected', revision: 1, chat: { adapter } })
    await expect(resumeChatSession(definition, { sessionId: 'shared', storage: { load: () => ({ version: 99 }), save: () => true } })).rejects.toThrow(ConfigError)
    await expect(resumeChatSession(definition, { sessionId: 'shared', storage: {
      load: () => ({ protocol: 'agentskit.chat.session', version: 1, sessionId: 'shared', definitionId: 'other', definitionRevision: 1, updatedAt: new Date().toISOString(), cursor: 0, confirmations: [] }),
      save: () => true,
    } })).rejects.toThrow('incompatible')
  })

  it('restores confirmation binding and keeps resolved actions inert', async () => {
    let stored: unknown
    const storage = { load: () => stored, save: (snapshot: unknown) => { stored = structuredClone(snapshot); return true } }
    const definition = defineChat({ id: 'actions', chat: { adapter } })
    const upstream = { proposeToolCall: vi.fn(async () => ({ id: 'call-1', name: 'email.send', args: { to: 'a@example.com' }, status: 'requires_confirmation' as const })), approve: vi.fn(async () => undefined), deny: vi.fn(async () => undefined) }
    const first = createChatSession(definition, { sessionId: 'shared', storage })
    const pending = await first.createConfirmation({ chat: upstream, now: () => 1, createId: () => 'one' }).propose({ name: 'email.send', input: { to: 'a@example.com' } })
    await first.persist()

    const resumed = await resumeChatSession(definition, { sessionId: 'shared', storage })
    const coordinator = resumed.createConfirmation({ chat: upstream, now: () => 2 })
    expect(coordinator.getByToolCall('call-1')?.token).toBe(pending.token)
    await coordinator.approve(pending.token, 'shared')
    await resumed.persist()
    const terminal = (await resumeChatSession(definition, { sessionId: 'shared', storage })).createConfirmation({ chat: upstream, now: () => 3 })
    await terminal.approve(pending.token, 'shared')
    expect(upstream.approve).toHaveBeenCalledTimes(1)
  })

  it('claims a pending confirmation once across concurrent clients', async () => {
    let stored: import('../../protocol/src/index.js').SessionSnapshot | undefined
    const storage = {
      load: () => stored === undefined ? undefined : structuredClone(stored),
      save: (snapshot: import('../../protocol/src/index.js').SessionSnapshot, expectedCursor: number | undefined) => {
        if (stored?.cursor !== expectedCursor) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    const definition = defineChat({ id: 'race', chat: { adapter } })
    const seedUpstream = { proposeToolCall: vi.fn(async () => ({ id: 'call-race', name: 'charge', args: {}, status: 'requires_confirmation' as const })), approve: vi.fn(), deny: vi.fn() }
    const seed = createChatSession(definition, { sessionId: 'shared', storage })
    const pending = await seed.createConfirmation({ chat: seedUpstream, createId: () => 'race' }).propose({ name: 'charge', input: {} })

    const [clientA, clientB] = await Promise.all([
      resumeChatSession(definition, { sessionId: 'shared', storage }),
      resumeChatSession(definition, { sessionId: 'shared', storage }),
    ])
    const approveA = vi.fn(async () => undefined)
    const approveB = vi.fn(async () => undefined)
    const coordinatorA = clientA.createConfirmation({ chat: { ...seedUpstream, approve: approveA } })
    const coordinatorB = clientB.createConfirmation({ chat: { ...seedUpstream, approve: approveB } })
    const results = await Promise.allSettled([
      coordinatorA.approve(pending.token, 'shared'),
      coordinatorB.approve(pending.token, 'shared'),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(approveA.mock.calls.length + approveB.mock.calls.length).toBe(1)
    expect(stored?.confirmations[0]?.status).toBe('approved')
  })

  it('keeps an accurate processing claim when upstream approval fails', async () => {
    let stored: import('../../protocol/src/index.js').SessionSnapshot | undefined
    const storage = {
      load: () => stored,
      save: (snapshot: import('../../protocol/src/index.js').SessionSnapshot, expected: number | undefined) => {
        if (stored?.cursor !== expected) return false
        stored = structuredClone(snapshot)
        return true
      },
    }
    const definition = defineChat({ id: 'failure-claim', chat: { adapter } })
    const upstream = { proposeToolCall: vi.fn(async () => ({ id: 'call-failure', name: 'charge', args: {}, status: 'requires_confirmation' as const })), approve: vi.fn(async () => { throw new Error('network lost') }), deny: vi.fn() }
    const seed = createChatSession(definition, { sessionId: 'shared', storage })
    const pending = await seed.createConfirmation({ chat: upstream, createId: () => 'failure' }).propose({ name: 'charge', input: {} })
    const resumed = await resumeChatSession(definition, { sessionId: 'shared', storage })
    await expect(resumed.createConfirmation({ chat: upstream }).approve(pending.token, 'shared')).rejects.toThrow('network lost')
    expect(stored?.confirmations[0]?.status).toBe('approving')
    const afterCrash = await resumeChatSession(definition, { sessionId: 'shared', storage })
    await afterCrash.createConfirmation({ chat: upstream }).approve(pending.token, 'shared')
    expect(upstream.approve).toHaveBeenCalledOnce()
  })
})
