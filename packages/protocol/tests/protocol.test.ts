import { buildMessage } from '@agentskit/core'
import { describe, expect, it } from 'vitest'

import { invalidComponentFrameFixtures, invalidTurnEventFixtures, validChoiceListFrame, validTurnEventFixtures } from '../src/fixtures.js'
import {
  ASSISTANT_CONTENT_PREFIX,
  AssistantContentPartSchema,
  createAssistantContentEncoder,
  createInteractionEvent,
  createSelectionEvent,
  createSnapshotEvent,
  createTurnSnapshotCursor,
  decodeComponentFrame,
  decodeAssistantContent,
  decodeSessionSnapshot,
  decodeTurnEvent,
  encodeTurnEvent,
  snapshotMessages,
  TURN_PROTOCOL,
} from '../src/index.js'

describe('v1 turn protocol', () => {
  it.each(validTurnEventFixtures)('accepts and round-trips $name', ({ event }) => {
    const decoded = decodeTurnEvent(encodeTurnEvent(event))
    expect(decoded).toEqual({ ok: true, event })
  })

  it.each(invalidTurnEventFixtures)('rejects $name inertly', ({ event, code }) => {
    const decoded = decodeTurnEvent(event)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.diagnostic.code).toBe(code)
      expect(decoded.diagnostic.retryable).toBe(false)
    }
  })

  it('strips additive unknown fields in a known v1 event', () => {
    const fixture = validTurnEventFixtures[0].event
    const decoded = decodeTurnEvent({ ...fixture, future: 'ignored', payload: { ...fixture.payload, future: true } })
    expect(decoded).toEqual({ ok: true, event: fixture })
  })

  it('strips additive structural fields from canonical message records', () => {
    const fixture = validTurnEventFixtures[3].event
    const source = fixture.payload.messages[0]!
    const messages = [{
      ...source,
      future: 'drop',
      parts: [{ type: 'text', text: 'hello', future: 'drop' }],
      toolCalls: source.toolCalls?.map(call => ({ ...call, future: 'drop' })),
    }]
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
    expect(decoded.event.payload.messages[0]).not.toHaveProperty('future')
    expect(decoded.event.payload.messages[0]?.parts?.[0]).not.toHaveProperty('future')
    expect(decoded.event.payload.messages[0]?.toolCalls?.[0]).not.toHaveProperty('future')
  })

  it('does not expose untrusted values or Zod issues in diagnostics', () => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, version: 1, eventId: 'safe', secret: 'do-not-leak' })
    expect(decoded).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
        eventId: 'safe',
      },
    })
  })

  it.each(['unsafe\nlog-entry', 'a'.repeat(129)])('does not echo an unsafe event id', (eventId) => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, version: 1, eventId })
    expect(decoded).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
      },
    })
  })

  it('classifies a missing version as an invalid payload', () => {
    const decoded = decodeTurnEvent({ protocol: TURN_PROTOCOL, event: 'client.turn.submit' })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('PROTOCOL_INVALID_PAYLOAD')
  })

  it('rejects non-JSON metadata at the wire boundary', () => {
    const fixture = validTurnEventFixtures[2].event
    const messages = [{ ...fixture.payload.messages[0], metadata: { callback: () => 'unsafe' } }]
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })
    expect(decoded.ok).toBe(false)
  })

  it('rejects invalid JSON without throwing', () => {
    expect(decodeTurnEvent('{')).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event is not valid JSON.',
        retryable: false,
      },
    })
  })

  it('rejects a cyclic message graph without throwing', () => {
    const fixture = validTurnEventFixtures[2].event
    const metadata: Record<string, unknown> = {}
    metadata.self = metadata
    const messages = [{ ...fixture.payload.messages[0], metadata }]
    expect(() => decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })).not.toThrow()
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('rejects excessively deep message metadata without throwing', () => {
    const fixture = validTurnEventFixtures[2].event
    let metadata: Record<string, unknown> = {}
    for (let depth = 0; depth < 40; depth += 1) metadata = { nested: metadata }
    const messages = [{ ...fixture.payload.messages[0], metadata }]
    expect(() => decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } })).not.toThrow()
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('rejects impossible calendar timestamps without normalization', () => {
    const fixture = validTurnEventFixtures[3].event
    const messages = [{ ...fixture.payload.messages[0], createdAt: '2026-02-30T00:00:00.000Z' }]
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it.each([
    { id: '' },
    { toolCalls: [{ id: '', name: 'lookup', args: {}, status: 'complete' }] },
    { toolCalls: [{ id: 'call-1', name: '', args: {}, status: 'complete' }] },
  ])('rejects empty canonical message and tool identities', (override) => {
    const fixture = validTurnEventFixtures[3].event
    const messages = [{ ...fixture.payload.messages[0], ...override }]
    expect(decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages } }).ok).toBe(false)
  })

  it('snapshots stateful message properties once', () => {
    const fixture = validTurnEventFixtures[3].event
    let reads = 0
    const message = { ...fixture.payload.messages[0] }
    Object.defineProperty(message, 'content', {
      enumerable: true,
      get: () => (++reads === 1 ? 'stable' : { unsafe: true }),
    })
    const decoded = decodeTurnEvent({ ...fixture, payload: { ...fixture.payload, messages: [message] } })
    expect(decoded.ok).toBe(true)
    if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
    expect(decoded.event.payload.messages[0]?.content).toBe('stable')
    expect(reads).toBe(1)
  })

  it('rejects hostile object access without throwing', () => {
    const input = new Proxy({}, { get: () => { throw new Error('blocked') } })
    expect(decodeTurnEvent(input)).toEqual({
      ok: false,
      diagnostic: {
        code: 'PROTOCOL_INVALID_PAYLOAD',
        message: 'Turn event payload is invalid.',
        retryable: false,
      },
    })
  })

  it('restores canonical AgentsKit message dates from a snapshot', () => {
    const decoded = decodeTurnEvent(validTurnEventFixtures[2].event)
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.event.event === 'server.turn.snapshot') {
      const messages = snapshotMessages(decoded.event)
      expect(messages[0]?.createdAt).toBeInstanceOf(Date)
      expect(messages[0]?.content).toBe('AgentsKit')
    }
  })

  it('validates snapshots again at the message projection boundary', () => {
    expect(() => snapshotMessages({ event: 'server.turn.snapshot' })).toThrow()
  })

  it('preserves additive lifecycle lineage', () => {
    const event = validTurnEventFixtures[3].event
    const decoded = decodeTurnEvent(event)
    expect(decoded.ok && decoded.event.event === 'server.turn.snapshot' ? decoded.event.payload.lineage : undefined).toEqual({
      operation: 'regenerate', parentTurnId: 'turn-previous', sourceMessageId: 'message-assistant',
    })
  })

  it('requires explicit parent turn and source message lineage for mutations', () => {
    const event = validTurnEventFixtures[3].event
    expect(decodeTurnEvent({ ...event, payload: { ...event.payload, lineage: { operation: 'edit' } } }).ok).toBe(false)
  })

  it('accepts reconnect snapshots and ignores duplicate, stale, or foreign delivery', () => {
    const current = validTurnEventFixtures[3].event
    const cursor = createTurnSnapshotCursor(current.sessionId)
    expect(cursor.apply({ ...current, eventId: 'foreign-first', sessionId: 'other' })).toBe(false)
    expect(cursor.apply(current)).toBe(true)
    expect(cursor.apply(current)).toBe(false)
    expect(cursor.apply({ ...current, eventId: 'stale', sequence: current.sequence - 1 })).toBe(false)
    expect(cursor.apply({ ...current, eventId: 'foreign', sessionId: 'other', sequence: current.sequence + 1 })).toBe(false)
    const next = { ...current, eventId: 'next', sequence: current.sequence + 1 }
    expect(cursor.apply(next)).toBe(true)
    expect(cursor.getSnapshot()?.eventId).toBe('next')
  })

  it('protects accepted cursor state from consumer mutation', () => {
    const current = validTurnEventFixtures[3].event
    const cursor = createTurnSnapshotCursor(current.sessionId)
    cursor.apply(current)
    const snapshot = cursor.getSnapshot()!
    expect(() => { (snapshot as { sequence: number }).sequence = 0 }).toThrow()
    expect(() => { (snapshot.payload.messages as unknown[]).push({}) }).toThrow()
    expect(cursor.apply({ ...current, eventId: 'stale-after-mutation', sequence: current.sequence - 1 })).toBe(false)
  })

  it.each(['retry', 'edit', 'regenerate'] as const)('creates canonical %s lineage snapshots', (operation) => {
    const event = createSnapshotEvent({
      eventId: `event-${operation}`, sessionId: 'session', turnId: `turn-${operation}`, sequence: 1,
      emittedAt: '2026-07-11T03:00:00.000Z', status: 'complete',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      messages: [buildMessage({ role: 'assistant', content: operation })],
      lineage: { operation, parentTurnId: 'turn-parent', sourceMessageId: 'message-source' },
    })
    expect(event.payload.lineage).toEqual({ operation, parentTurnId: 'turn-parent', sourceMessageId: 'message-source' })
    expect(snapshotMessages(event)[0]?.content).toBe(operation)
  })
})

describe('application session protocol', () => {
  const snapshot = {
    protocol: 'agentskit.chat.session', version: 1, sessionId: 'session', definitionId: 'support', definitionRevision: 1,
    updatedAt: '2026-07-11T00:00:00.000Z', cursor: 2,
    conversation: { state: 'collecting', decisions: [{ messageId: 'user-1', input: '/start', routeId: 'start', kind: 'deterministic', content: 'Name?', fromState: 'idle', toState: 'collecting' }] },
    confirmations: [{ token: 'confirm-1', action: 'email.send', input: { to: 'a@example.com' }, toolCallId: 'call-1', expiresAt: 99, status: 'pending' }],
  } as const

  it('validates current snapshots and explicitly migrates v0', () => {
    expect(decodeSessionSnapshot(snapshot)).toEqual({ ok: true, snapshot })
    const { protocol: _protocol, ...legacy } = snapshot
    const decoded = decodeSessionSnapshot({ ...legacy, version: 0 })
    expect(decoded.ok && decoded.snapshot).toMatchObject({ protocol: 'agentskit.chat.session', version: 1, sessionId: 'session' })
  })

  it('rejects corrupt and unsupported snapshots without validator details', () => {
    expect(decodeSessionSnapshot('{').ok).toBe(false)
    expect(decodeSessionSnapshot({ ...snapshot, version: 9 })).toEqual({
      ok: false,
      diagnostic: { code: 'SESSION_UNSUPPORTED_VERSION', message: 'Session snapshot uses an unsupported version.', retryable: false },
    })
    expect(decodeSessionSnapshot({ ...snapshot, confirmations: [{ ...snapshot.confirmations[0], input: { bad: () => undefined } }] }).ok).toBe(false)
    expect(decodeSessionSnapshot({ ...snapshot, confirmations: [snapshot.confirmations[0], snapshot.confirmations[0]] }).ok).toBe(false)
    expect(decodeSessionSnapshot({ ...snapshot, conversation: { ...snapshot.conversation, decisions: [snapshot.conversation.decisions[0], snapshot.conversation.decisions[0]] } }).ok).toBe(false)
  })
})

describe('v1 component protocol', () => {
  it('decodes a valid ChoiceList frame', () => {
    expect(decodeComponentFrame(JSON.stringify(validChoiceListFrame))).toEqual({ ok: true, frame: validChoiceListFrame })
  })

  it.each(invalidComponentFrameFixtures)('rejects $name inertly', ({ frame, code }) => {
    const decoded = decodeComponentFrame(frame)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic).toMatchObject({ code, retryable: false })
  })

  it('creates the common semantic selection event', () => {
    expect(createSelectionEvent(validChoiceListFrame, 'docs')).toEqual({
      protocol: 'agentskit.chat.component', version: 1, type: 'select',
      componentKey: 'choice-list', instanceId: 'destination-choice', choiceId: 'docs',
    })
  })

  it('creates bounded generic interaction events', () => {
    expect(createInteractionEvent({ ...validChoiceListFrame, componentKey: 'form' }, 'submit', { email: 'ada@example.com' })).toMatchObject({
      type: 'interact', componentKey: 'form', event: 'submit', value: { email: 'ada@example.com' },
    })
    expect(() => createInteractionEvent(validChoiceListFrame, 'Bad Event')).toThrow()
    expect(() => createInteractionEvent(validChoiceListFrame, 'select', { callback: () => undefined })).toThrow()
  })

  it('does not throw for invalid JSON or hostile objects', () => {
    expect(decodeComponentFrame('{').ok).toBe(false)
    const hostile = new Proxy({}, { get: () => { throw new Error('blocked') } })
    expect(() => decodeComponentFrame(hostile)).not.toThrow()
    expect(decodeComponentFrame(hostile).ok).toBe(false)
  })

  it.each([
    { unsafe: () => undefined },
    { unsafe: Symbol('unsafe') },
  ])('rejects non-JSON props', (props) => {
    expect(decodeComponentFrame({ ...validChoiceListFrame, props }).ok).toBe(false)
  })

  it('rejects cyclic and excessively deep props', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(decodeComponentFrame({ ...validChoiceListFrame, props: cyclic }).ok).toBe(false)
    let deep: Record<string, unknown> = {}
    for (let index = 0; index < 22; index += 1) deep = { child: deep }
    expect(decodeComponentFrame({ ...validChoiceListFrame, props: deep }).ok).toBe(false)
  })

  it.each([undefined, '1'])('classifies a missing or non-numeric version as invalid', (version) => {
    const decoded = decodeComponentFrame({ ...validChoiceListFrame, version })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.diagnostic.code).toBe('COMPONENT_INVALID_FRAME')
  })

  it('rejects oversized fallback text', () => {
    expect(decodeComponentFrame({
      ...validChoiceListFrame,
      fallback: { kind: 'choice-list', summary: 'x'.repeat(4_097) },
    }).ok).toBe(false)
  })
})

describe('v1 assistant content protocol', () => {
  it('round-trips ordered text and component parts while keeping text inert', () => {
    const encoder = createAssistantContentEncoder()
    const content = encoder.encode({ kind: 'text', text: `Hello\n${ASSISTANT_CONTENT_PREFIX}{"kind":"component"}` })
      + encoder.encode({ kind: 'component', frame: validChoiceListFrame })
    expect(decodeAssistantContent(content)).toEqual({
      ok: true,
      complete: true,
      parts: [
        { kind: 'text', text: `Hello\n${ASSISTANT_CONTENT_PREFIX}{"kind":"component"}` },
        { kind: 'component', frame: validChoiceListFrame },
      ],
    })
  })

  it('preserves completed text records and ignores an incomplete trailing record', () => {
    const encoder = createAssistantContentEncoder()
    const content = encoder.encode({ kind: 'text', text: 'Grounded ' })
      + encoder.encode({ kind: 'text', text: 'answer.' })
      + '{"kind":"component"'
    expect(decodeAssistantContent(content)).toEqual({
      ok: true,
      complete: false,
      parts: [{ kind: 'text', text: 'Grounded ' }, { kind: 'text', text: 'answer.' }],
    })
  })

  it.each(['\u001e', '\u001eagentskit.chat.con', '\u001eagentskit.chat.content/1'])('keeps a partial prefix inert', (content) => {
    expect(decodeAssistantContent(content)).toEqual({ ok: true, parts: [], complete: false })
  })

  it('returns safe diagnostics for invalid, unsupported, and bounded envelopes', () => {
    expect(decodeAssistantContent(`${ASSISTANT_CONTENT_PREFIX}{bad}\n`)).toEqual({
      ok: false,
      diagnostic: { code: 'ASSISTANT_CONTENT_INVALID_RECORD', message: 'Assistant content record is invalid.', retryable: false },
    })
    expect(decodeAssistantContent(`\u001eagentskit.chat.content/2\n`)).toEqual({
      ok: false,
      diagnostic: { code: 'ASSISTANT_CONTENT_UNSUPPORTED_VERSION', message: 'Assistant content envelope uses an unsupported version.', retryable: false },
    })
    expect(decodeAssistantContent(ASSISTANT_CONTENT_PREFIX + 'x'.repeat(262_145))).toEqual({
      ok: false,
      diagnostic: { code: 'ASSISTANT_CONTENT_LIMIT_EXCEEDED', message: 'Assistant content envelope exceeds its safety limit.', retryable: false },
    })
  })

  it('enforces the total limit in UTF-8 bytes', () => {
    const encoder = createAssistantContentEncoder()
    let content = ''
    for (let index = 0; index < 9; index += 1) content += encoder.encode({ kind: 'text', text: '😀'.repeat(8_192) })
    expect(content.length).toBeLessThan(262_144)
    expect(decodeAssistantContent(content)).toEqual({
      ok: false,
      diagnostic: { code: 'ASSISTANT_CONTENT_LIMIT_EXCEEDED', message: 'Assistant content envelope exceeds its safety limit.', retryable: false },
    })
  })

  it('returns only parts that still satisfy the exported part schema', () => {
    const encoder = createAssistantContentEncoder()
    const content = encoder.encode({ kind: 'text', text: 'a'.repeat(16_384) })
      + encoder.encode({ kind: 'text', text: 'b'.repeat(16_384) })
    const decoded = decodeAssistantContent(content)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.parts.every(part => AssistantContentPartSchema.safeParse(part).success)).toBe(true)
  })

  it('rejects invalid parts at the encoder boundary', () => {
    const encoder = createAssistantContentEncoder()
    expect(() => encoder.encode({ kind: 'text', text: '' })).toThrow()
    expect(() => encoder.encode({ kind: 'component', frame: { ...validChoiceListFrame, version: 2 } })).toThrow()
  })
})
