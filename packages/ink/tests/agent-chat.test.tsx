import { buildMessage } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { ChoiceListComponent, defineComponentManifest } from '@agentskit/chat'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { AgentChat, ChoiceList, SemanticFallback } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }),
}

describe('Ink application shell', () => {
  it('selects a ChoiceList with terminal navigation', () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const onSelect = vi.fn()
    const view = render(<ChoiceList frame={validChoiceListFrame} manifest={manifest} onSelect={onSelect} />)
    expect(view.lastFrame()).toContain('Where should we go?')
    view.stdin.write('\u001B[B')
    view.stdin.write('\r')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ type: 'select', choiceId: 'demo' }))
    view.unmount()
    const invalid = render(<ChoiceList frame={invalidChoiceListPropsFrame} manifest={manifest} onSelect={onSelect} />)
    invalid.stdin.write('\r')
    expect(onSelect).toHaveBeenCalledOnce()
    invalid.unmount()
  })

  it('selects two-digit choices and keeps inactive lists inert', () => {
    const choices = Array.from({ length: 10 }, (_, index) => ({ id: `choice-${index + 1}`, label: `Choice ${index + 1}` }))
    const frame = { ...validChoiceListFrame, props: { prompt: 'Pick ten', choices } }
    const manifest = defineComponentManifest([ChoiceListComponent])
    const active = vi.fn()
    const inactive = vi.fn()
    const view = render(<>
      <ChoiceList frame={frame} manifest={manifest} onSelect={inactive} isActive={false} />
      <ChoiceList frame={frame} manifest={manifest} onSelect={active} />
    </>)
    view.stdin.write('1')
    view.stdin.write('0')
    view.stdin.write('\r')
    expect(active).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'choice-10' }))
    expect(inactive).not.toHaveBeenCalled()
    view.unmount()
  })

  it('renders an agent frame through the Ink shell and falls back for unknown components', () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const onSelect = vi.fn()
    let agentCalls = 0
    const countingAdapter: AdapterFactory = {
      createSource: () => { agentCalls += 1; return { async *stream() { yield { type: 'done' } }, abort() {} } },
    }
    const view = render(<AgentChat definition={{
      id: 'choice-agent', components: manifest,
      chat: { adapter: countingAdapter, initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(validChoiceListFrame) })] },
    }} onComponentSelect={onSelect} />)
    expect(view.lastFrame()).toContain('Where should we go?')
    view.stdin.write('1')
    view.stdin.write('\r')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'docs' }))
    expect(agentCalls).toBe(0)
    view.stdin.write('n')
    expect(view.lastFrame()).toContain('n')
    view.unmount()

    const fallback = render(<AgentChat definition={{
      id: 'choice-unknown', components: manifest,
      chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(unknownComponentFrame) })] },
    }} />)
    expect(fallback.lastFrame()).toContain('[unsupported visual: choice-list] Choose Documentation or Demo.')
    fallback.unmount()

    const invalidContent = JSON.stringify(invalidComponentFrameFixtures[1].frame)
    const invalidEnvelope = render(<AgentChat definition={{
      id: 'choice-invalid', chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: invalidContent })] },
    }} />)
    expect(invalidEnvelope.lastFrame()).toContain('Component frame uses an unsupported version.')
    expect(invalidEnvelope.lastFrame()).not.toContain(invalidContent)
    invalidEnvelope.unmount()
  })

  it('returns terminal focus to the composer after selection without an external handler', () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const view = render(<AgentChat definition={{
      id: 'choice-no-handler', components: manifest,
      chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(validChoiceListFrame) })] },
    }} />)
    view.stdin.write('\r')
    view.stdin.write('n')
    expect(view.lastFrame()).toContain('n')
    view.unmount()
  })

  it.each([
    { key: '1', expected: 1, label: 'approves once' },
    { key: '3', expected: 0, label: 'rejects without execution' },
  ])('$label through the official terminal confirmation', async ({ key, expected }) => {
    const execute = vi.fn()
    const actionable = {
      ...validChoiceListFrame,
      props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs'
        ? { ...choice, action: { name: 'open-docs', input: { path: '/guide' } } } : choice) },
    }
    const view = render(<AgentChat definition={{
      id: `ink-action-${key}`,
      components: defineComponentManifest([ChoiceListComponent]),
      chat: {
        adapter,
        initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(actionable) })],
        tools: [{ name: 'open-docs', requiresConfirmation: true, execute }],
      },
    }} />)
    view.stdin.write('\r')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(view.lastFrame()).toContain('Allow open-docs?')
    view.stdin.write(key)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(execute).toHaveBeenCalledTimes(expected)
    view.unmount()
  })

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
