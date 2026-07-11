import { buildMessage } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { AgentChat, SemanticFallback } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }),
}

describe('Ink application shell', () => {
  it('renders the semantic fallback in a terminal frame', () => {
    const view = render(<SemanticFallback fallback={{ kind: 'map', summary: 'Two selected regions.' }} />)
    expect(view.lastFrame()).toContain('[unsupported visual: map] Two selected regions.')
    view.unmount()
  })

  it('rejects an invalid fallback before terminal rendering', () => {
    const view = render(<SemanticFallback fallback={{ kind: '', summary: 'Missing kind.' }} />)
    expect(view.lastFrame()).not.toContain('[unsupported visual:')
    view.unmount()
  })

  it('delegates the shared definition to the upstream Ink shell', () => {
    const view = render(<AgentChat definition={{
      id: 'demo',
      chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: 'Welcome' })] },
    }} placeholder="Ask" />)
    expect(view.lastFrame()).toContain('Ask')
    expect(view.lastFrame()).toContain('Welcome')
    view.unmount()
  })
})
