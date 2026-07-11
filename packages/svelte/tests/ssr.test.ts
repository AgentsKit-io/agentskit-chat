import type { AdapterFactory } from '@agentskit/core'
import { render } from 'svelte/server'
import { expect, it } from 'vitest'
import { AgentChat } from '../dist/index.js'

const adapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }) }

it('renders the packaged Svelte entry on the server', () => {
  const result = render(AgentChat, { props: { definition: { id: 'ssr', chat: { adapter } } } })
  expect(result.body).toContain('aria-label="ssr chat"')
})
