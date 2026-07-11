import type { AdapterFactory } from '@agentskit/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { validTurnEventFixtures } from '../../protocol/src/fixtures.js'
import { decodeTurnEvent, snapshotMessages } from '../../protocol/src/index.js'
import { testTurnProtocolConformance } from '../../../tests/turn-protocol-conformance.js'
import { AgentChat } from '../src/index.js'

testTurnProtocolConformance('React')

afterEach(cleanup)

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() {}, abort() {} }),
}

it('renders the shared complete snapshot through the React shell', () => {
  const decoded = decodeTurnEvent(validTurnEventFixtures[3].event)
  expect(decoded.ok).toBe(true)
  if (!decoded.ok || decoded.event.event !== 'server.turn.snapshot') return

  render(<AgentChat definition={{ id: 'protocol-react', chat: { adapter, initialMessages: snapshotMessages(decoded.event) } }} />)
  expect(screen.getByText('AgentsKit received: hello')).toBeTruthy()
})
