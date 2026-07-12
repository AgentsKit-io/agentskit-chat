import { TestBed } from '@angular/core/testing'
import type { AdapterFactory } from '@agentskit/core'
import { resumeChatSession } from '@agentskit/chat'
import { expect, it } from 'vitest'
import { persistentSessionFixture, validTurnEventFixtures } from '../../protocol/src/fixtures.js'
import { decodeTurnEvent, snapshotMessages } from '../../protocol/src/index.js'
import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { AgentChatComponent } from '../src/index.js'

testTurnProtocolConformance('Angular')

const adapter: AdapterFactory = { createSource: () => ({ async *stream() {}, abort() {} }) }

it('renders the shared complete snapshot through the Angular shell', () => {
  const decoded = decodeTurnEvent(validTurnEventFixtures[3].event)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return
  const fixture = TestBed.createComponent(AgentChatComponent)
  fixture.componentRef.setInput('definition', { id: 'protocol-angular', chat: { adapter, initialMessages: snapshotMessages(decoded.event) } })
  fixture.detectChanges()
  expect(fixture.nativeElement.textContent).toContain('AgentsKit received: hello')
})

it('resumes the shared cross-client session fixture', async () => {
  const definition = { id: 'protocol-session', chat: { adapter }, conversation: { initial: 'complete', states: { complete: {} }, routes: [] } } as const
  const session = await resumeChatSession(definition, { sessionId: 'cross-client', storage: { load: () => persistentSessionFixture, save: () => true } })
  const fixture = TestBed.createComponent(AgentChatComponent)
  fixture.componentRef.setInput('definition', definition)
  fixture.componentRef.setInput('session', session)
  fixture.detectChanges()
  expect(session.getConversationSnapshot()?.state).toBe('complete')
})
