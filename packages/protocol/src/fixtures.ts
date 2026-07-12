import type { ComponentDecodeCode, ComponentRenderFrame, ProtocolDecodeCode, SessionSnapshot, TurnEvent } from './index.js'

export interface TurnEventFixture {
  readonly name: string
  readonly event: TurnEvent
}

export interface InvalidTurnEventFixture {
  readonly name: string
  readonly event: unknown
  readonly code: ProtocolDecodeCode
}

const base = {
  protocol: 'agentskit.chat.turn',
  version: 1,
  sessionId: 'session-conformance',
  turnId: 'turn-conformance',
  emittedAt: '2026-07-11T03:00:00.000Z',
} as const

export const validTurnEventFixtures = [
  {
    name: 'submit',
    event: {
      ...base,
      eventId: 'event-submit',
      sequence: 0,
      event: 'client.turn.submit',
      payload: { input: 'hello' },
    },
  },
  {
    name: 'idle snapshot',
    event: {
      ...base,
      eventId: 'event-idle',
      sequence: 1,
      event: 'server.turn.snapshot',
      payload: {
        status: 'idle',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        messages: [],
      },
    },
  },
  {
    name: 'streaming snapshot',
    event: {
      ...base,
      eventId: 'event-streaming',
      sequence: 2,
      event: 'server.turn.snapshot',
      payload: {
        status: 'streaming',
        lineage: { operation: 'submit' },
        usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 },
        messages: [{
          id: 'message-assistant',
          role: 'assistant',
          content: 'AgentsKit',
          status: 'streaming',
          createdAt: '2026-07-11T03:00:00.000Z',
        }],
      },
    },
  },
  {
    name: 'complete snapshot with tool call',
    event: {
      ...base,
      eventId: 'event-complete',
      sequence: 3,
      event: 'server.turn.snapshot',
      payload: {
        status: 'complete',
        lineage: { operation: 'regenerate', parentTurnId: 'turn-previous', sourceMessageId: 'message-assistant' },
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
        messages: [{
          id: 'message-assistant',
          role: 'assistant',
          content: 'AgentsKit received: hello',
          status: 'complete',
          toolCalls: [{
            id: 'tool-call-1',
            name: 'lookup',
            args: { query: 'hello' },
            result: 'found',
            status: 'complete',
          }],
          createdAt: '2026-07-11T03:00:01.000Z',
        }],
      },
    },
  },
  {
    name: 'diagnostic',
    event: {
      ...base,
      eventId: 'event-diagnostic',
      sequence: 4,
      event: 'server.turn.diagnostic',
      payload: {
        version: 1,
        code: 'ADAPTER_FAILED',
        message: 'The adapter failed.',
        retryable: false,
      },
    },
  },
  {
    name: 'error snapshot',
    event: {
      ...base,
      eventId: 'event-error',
      sequence: 5,
      event: 'server.turn.snapshot',
      payload: {
        status: 'error',
        usage: { promptTokens: 2, completionTokens: 0, totalTokens: 2 },
        messages: [],
        error: {
          version: 1,
          code: 'ADAPTER_FAILED',
          message: 'The adapter failed.',
          retryable: false,
        },
      },
    },
  },
] as const satisfies readonly TurnEventFixture[]

export const invalidTurnEventFixtures = [
  {
    name: 'invalid payload',
    event: null,
    code: 'PROTOCOL_INVALID_PAYLOAD',
  },
  {
    name: 'unknown version',
    event: { ...base, eventId: 'future', version: 2, sequence: 0, event: 'client.turn.submit', payload: { input: 'hello' } },
    code: 'PROTOCOL_UNSUPPORTED_VERSION',
  },
  {
    name: 'unknown event',
    event: { ...base, eventId: 'unknown', sequence: 0, event: 'server.turn.future', payload: {} },
    code: 'PROTOCOL_UNKNOWN_EVENT',
  },
  {
    name: 'blank input',
    event: { ...base, eventId: 'blank', sequence: 0, event: 'client.turn.submit', payload: { input: '   ' } },
    code: 'PROTOCOL_INVALID_PAYLOAD',
  },
] as const satisfies readonly InvalidTurnEventFixture[]

export const validChoiceListFrame = {
  protocol: 'agentskit.chat.component',
  version: 1,
  type: 'render',
  componentKey: 'choice-list',
  instanceId: 'destination-choice',
  props: {
    prompt: 'Where should we go?',
    choices: [
      { id: 'docs', label: 'Documentation', description: 'Read the component guide.' },
      { id: 'demo', label: 'Demo' },
    ],
  },
  fallback: { kind: 'choice-list', summary: 'Choose Documentation or Demo.' },
} as const satisfies ComponentRenderFrame

const catalogFrame = (componentKey: string, props: unknown, summary: string): ComponentRenderFrame => ({
  protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey,
  instanceId: `${componentKey}-fixture`, props, fallback: { kind: componentKey, summary },
})

export const standardComponentFrameFixtures = [
  catalogFrame('button-group', { label: 'Actions', buttons: [{ id: 'save', label: 'Save' }] }, 'Choose Save.'),
  validChoiceListFrame,
  catalogFrame('form', { title: 'Contact', fields: [{ id: 'email', label: 'Email', type: 'email', required: true }], submitLabel: 'Send' }, 'Contact form.'),
  catalogFrame('confirmation', { title: 'Delete?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }, 'Confirm deletion.'),
  catalogFrame('progress', { label: 'Upload', value: 42, status: 'Uploading' }, 'Upload is 42% complete.'),
  catalogFrame('source-list', { label: 'Sources', sources: [{ id: 'docs', title: 'Documentation', url: '/docs' }] }, 'Sources: Documentation.'),
  catalogFrame('link-card', { title: 'Guide', description: 'Read the guide.', href: 'https://example.com/guide' }, 'Guide link.'),
  catalogFrame('error-notice', { title: 'Failed', message: 'Try again.', code: 'E_TEST', retryLabel: 'Retry' }, 'Failed: Try again.'),
  catalogFrame('tool-call', { name: 'Search', status: 'complete', arguments: { q: 'AgentsKit' }, result: 'Found' }, 'Search completed.'),
  catalogFrame('approval-request', { title: 'Approve send?', description: 'Send the email.', approveLabel: 'Approve', denyLabel: 'Deny' }, 'Approval required.'),
  catalogFrame('table', { caption: 'Users', columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'Ada' }] }, 'Users table with one row.'),
  catalogFrame('file-attachment', { name: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 1024, url: '/report.pdf' }, 'Attached report.pdf.'),
] as const satisfies readonly ComponentRenderFrame[]

export const invalidChoiceListPropsFrame = {
  ...validChoiceListFrame,
  props: { prompt: '', choices: [] },
} as const

export const unknownComponentFrame = {
  ...validChoiceListFrame,
  componentKey: 'future-component',
} as const satisfies ComponentRenderFrame

export const invalidComponentFrameFixtures = [
  { name: 'invalid frame', frame: null, code: 'COMPONENT_INVALID_FRAME' },
  { name: 'unsupported version', frame: { ...validChoiceListFrame, version: 2 }, code: 'COMPONENT_UNSUPPORTED_VERSION' },
  { name: 'unknown type', frame: { ...validChoiceListFrame, type: 'future' }, code: 'COMPONENT_UNKNOWN_TYPE' },
] as const satisfies readonly { readonly name: string; readonly frame: unknown; readonly code: ComponentDecodeCode }[]

export const persistentSessionFixture = {
  protocol: 'agentskit.chat.session', version: 1, sessionId: 'cross-client', definitionId: 'protocol-session', definitionRevision: 1,
  updatedAt: '2026-07-11T00:00:00.000Z', cursor: 1,
  conversation: { state: 'complete', decisions: [] },
  confirmations: [],
} as const satisfies SessionSnapshot
