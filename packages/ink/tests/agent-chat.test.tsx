import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { AgentChat, SemanticFallback, formatSemanticFallback } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }),
}

describe('Ink application shell', () => {
  it('formats unsupported visuals as stable semantic text', () => {
    expect(formatSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' }))
      .toBe('[unsupported visual: chart] Revenue rose 12%.')
  })

  it('renders the semantic fallback in a terminal frame', () => {
    const view = render(<SemanticFallback kind="map" summary="Two selected regions." />)
    expect(view.lastFrame()).toContain('[unsupported visual: map] Two selected regions.')
    view.unmount()
  })

  it('delegates the shared definition to the upstream Ink shell', () => {
    const view = render(<AgentChat definition={{ id: 'demo', chat: { adapter } }} placeholder="Ask" />)
    expect(view.lastFrame()).toContain('Ask')
    view.unmount()
  })
})
