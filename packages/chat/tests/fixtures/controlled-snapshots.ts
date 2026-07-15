const base = {
  sessionId: 'controlled-conformance',
  input: '',
  usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
} as const

const assistant = (content: string, status: 'streaming' | 'complete' | 'error' = 'complete') => ({
  id: `assistant-${status}`,
  role: 'assistant' as const,
  content,
  status,
  createdAt: '2026-07-14T00:00:00.000Z',
})

export const controlledSnapshotFixtures = {
  idle: { ...base, messages: [], status: 'idle', error: null },
  streaming: { ...base, messages: [assistant('Synthetic stream', 'streaming')], status: 'streaming', error: null },
  error: { ...base, messages: [assistant('Synthetic failure', 'error')], status: 'error', error: { code: 'HOST_FAILED', message: 'Synthetic host failure.' } },
  cancellationReady: { ...base, messages: [assistant('Cancelable stream', 'streaming')], status: 'streaming', error: null },
  confirmation: {
    ...base,
    messages: [{
      ...assistant('Confirm the synthetic action.'),
      toolCalls: [{ id: 'synthetic-call', name: 'synthetic-action', args: {}, status: 'requires_confirmation' }],
    }],
    status: 'complete',
    error: null,
  },
  semanticComponent: {
    ...base,
    messages: [assistant(JSON.stringify({
      protocol: 'agentskit.chat.component',
      version: 1,
      type: 'render',
      componentKey: 'source-list',
      instanceId: 'synthetic-sources',
      props: { label: 'Synthetic sources', sources: [{ id: 'source-1', title: 'Public guide', url: 'https://example.com/guide' }] },
      fallback: { kind: 'source-list', summary: 'One synthetic public source.' },
    }))],
    status: 'complete',
    error: null,
  },
} as const
