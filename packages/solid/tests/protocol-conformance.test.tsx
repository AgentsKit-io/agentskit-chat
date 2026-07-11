import type { AdapterFactory } from '@agentskit/core'
import { resumeChatSession } from '@agentskit/chat'
import { render } from '@solidjs/testing-library'
import { expect, it } from 'vitest'
import { persistentSessionFixture, validTurnEventFixtures } from '../../protocol/src/fixtures.js'
import { decodeTurnEvent, snapshotMessages } from '../../protocol/src/index.js'
import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { AgentChat } from '../src/index.js'

testTurnProtocolConformance('Solid')
const adapter: AdapterFactory = { createSource: () => ({ async *stream() {}, abort() {} }) }

it('renders the shared complete snapshot through the Solid shell', () => {
  const decoded = decodeTurnEvent(validTurnEventFixtures[3].event); expect(decoded.ok).toBe(true)
  if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
  const view = render(() => <AgentChat definition={{ id: 'protocol-solid', chat: { adapter, initialMessages: snapshotMessages(decoded.event) } }} />)
  expect(view.container.textContent).toContain('AgentsKit received: hello')
})

it('resumes the shared cross-client session fixture', async () => {
  const definition = { id: 'protocol-session', chat: { adapter }, conversation: { initial: 'complete', states: { complete: {} }, routes: [] } } as const
  const session = await resumeChatSession(definition, { sessionId: 'cross-client', storage: { load: () => persistentSessionFixture, save: () => true } })
  render(() => <AgentChat definition={definition} session={session} />); expect(session.getConversationSnapshot()?.state).toBe('complete')
})
