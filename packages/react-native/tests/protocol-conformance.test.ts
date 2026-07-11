import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { expect, it } from 'vitest'
import { resumeChatSession } from '@agentskit/chat'
import { persistentSessionFixture } from '../../protocol/src/fixtures.js'
import type { AdapterFactory } from '@agentskit/core'

testTurnProtocolConformance('React Native')

it('accepts the shared cross-client session before native mount', async () => {
  const adapter: AdapterFactory = { createSource: () => ({ async *stream() {}, abort() {} }) }
  const definition = { id: 'protocol-session', chat: { adapter }, conversation: { initial: 'complete', states: { complete: {} }, routes: [] } } as const
  const session = await resumeChatSession(definition, { sessionId: 'cross-client', storage: { load: () => persistentSessionFixture, save: () => true } })
  expect(session.getConversationSnapshot()?.state).toBe('complete')
})
