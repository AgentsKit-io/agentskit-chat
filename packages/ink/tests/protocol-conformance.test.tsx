import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import React from 'react'
import { expect, it } from 'vitest'

import { validTurnEventFixtures } from '../../protocol/src/fixtures.js'
import { decodeTurnEvent, snapshotMessages } from '../../protocol/src/index.js'
import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { AgentChat } from '../src/index.js'

testTurnProtocolConformance('Ink')

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() {}, abort() {} }),
}

it('renders the shared complete snapshot through the Ink shell', () => {
  const decoded = decodeTurnEvent(validTurnEventFixtures[3].event)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return

  const view = render(<AgentChat definition={{ id: 'protocol-ink', chat: { adapter, initialMessages: snapshotMessages(decoded.event) } }} />)
  expect(view.lastFrame()).toContain('AgentsKit received: hello')
  view.unmount()
})
