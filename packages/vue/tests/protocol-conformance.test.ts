import type { AdapterFactory } from '@agentskit/core'
import { resumeChatSession } from '@agentskit/chat'
import { createApp, h, nextTick } from 'vue'
import { expect, it } from 'vitest'
import { persistentSessionFixture, validTurnEventFixtures } from '../../protocol/src/fixtures.js'
import { decodeTurnEvent, snapshotMessages } from '../../protocol/src/index.js'
import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { AgentChat } from '../src/index.js'

testTurnProtocolConformance('Vue')

const adapter: AdapterFactory = { createSource: () => ({ async *stream() {}, abort() {} }) }
const mount = async (component: ReturnType<typeof h>): Promise<HTMLElement> => {
  const root = document.createElement('div')
  createApp({ render: () => component }).mount(root)
  await nextTick()
  return root
}

it('renders the shared complete snapshot through the Vue shell', async () => {
  const decoded = decodeTurnEvent(validTurnEventFixtures[3].event)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
  const root = await mount(h(AgentChat, { definition: { id: 'protocol-vue', chat: { adapter, initialMessages: snapshotMessages(decoded.event) } } }))
  expect(root.textContent).toContain('AgentsKit received: hello')
})

it('resumes the shared cross-client session fixture', async () => {
  const definition = { id: 'protocol-session', chat: { adapter }, conversation: { initial: 'complete', states: { complete: {} }, routes: [] } } as const
  const session = await resumeChatSession(definition, { sessionId: 'cross-client', storage: { load: () => persistentSessionFixture, save: () => true } })
  await mount(h(AgentChat, { definition, session }))
  expect(session.getConversationSnapshot()?.state).toBe('complete')
})
