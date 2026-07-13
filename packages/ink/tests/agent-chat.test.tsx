import { buildMessage } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import { Text } from 'ink'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { ChoiceListComponent, StandardComponentCatalog, defineComponentManifest } from '@agentskit/chat'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, standardComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { createAssistantContentEncoder } from '../../protocol/src/index.js'
import { AgentChat, ChoiceList, SemanticFallback, StandardComponent, toChatInkTheme } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }),
}

describe('Ink application shell', () => {
  it('renders the complete standard catalog and emits keyboard interactions', () => {
    const manifest = defineComponentManifest(StandardComponentCatalog); const onInteract = vi.fn()
    for (const frame of standardComponentFrameFixtures.filter(item => item.componentKey !== 'choice-list')) {
      const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} isActive={false} />)
      expect(view.lastFrame()).toBeTruthy(); view.unmount()
    }
    const view = render(<StandardComponent frame={standardComponentFrameFixtures[0]} manifest={manifest} onInteract={onInteract} />)
    view.stdin.write('\r'); expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'select', value: 'save' }))
  })
  it('collects form fields in the terminal before submitting', async () => {
    const manifest = defineComponentManifest(StandardComponentCatalog)
    const frame = standardComponentFrameFixtures.find(item => item.componentKey === 'form')!
    const onInteract = vi.fn()
    const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} />)
    view.stdin.write('A'); view.stdin.write('d'); view.stdin.write('a')
    await new Promise(resolve => setTimeout(resolve, 0))
    view.stdin.write('\r')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'submit', value: expect.objectContaining({ email: 'Ada' }) }))
    view.unmount()
  })

  it('does not block the composer for display-only components', async () => {
    const manifest = defineComponentManifest(StandardComponentCatalog)
    const frame = standardComponentFrameFixtures.find(item => item.componentKey === 'progress')!
    const view = render(<AgentChat definition={{ id: 'display-only', components: manifest, chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(frame) })] } }} />)
    view.stdin.write('n'); view.stdin.write('e'); view.stdin.write('x'); view.stdin.write('t')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(view.lastFrame()).toContain('❯ t')
    view.unmount()
  })
  it('maps semantic tokens to Ink capabilities and accepts a terminal slot', () => {
    expect(toChatInkTheme({ colors: { accent: '#0000ff', danger: '#ff0000' } })).toMatchObject({
      prompt: { active: '#0000ff' }, toolStatus: { error: { color: '#ff0000' } },
    })
    const Slot = () => <Text>Custom terminal message</Text>
    const view = render(<AgentChat definition={{ id: 'slots', chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } }} slots={{ Message: Slot }} />)
    expect(view.lastFrame()).toContain('Custom terminal message')
    view.unmount()
  })

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
    const encoder = createAssistantContentEncoder()
    const orderedChoice = encoder.encode({ kind: 'text', text: 'Choose a destination.' })
      + encoder.encode({ kind: 'component', frame: validChoiceListFrame })
    const view = render(<AgentChat definition={{
      id: 'choice-agent', components: manifest,
      chat: { adapter: countingAdapter, initialMessages: [buildMessage({ role: 'assistant', content: orderedChoice })] },
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

  it('activates only the last unresolved interactive frame in one ordered message', () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const first = { ...validChoiceListFrame, instanceId: 'first-choice' }
    const second = { ...validChoiceListFrame, instanceId: 'second-choice' }
    const encoder = createAssistantContentEncoder()
    const content = encoder.encode({ kind: 'component', frame: first })
      + encoder.encode({ kind: 'text', text: 'Then choose again.' })
      + encoder.encode({ kind: 'component', frame: second })
    const onSelect = vi.fn()
    const view = render(<AgentChat definition={{
      id: 'ordered-focus', components: manifest,
      chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content })] },
    }} onComponentSelect={onSelect} />)
    view.stdin.write('\r')
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'second-choice' }))
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
