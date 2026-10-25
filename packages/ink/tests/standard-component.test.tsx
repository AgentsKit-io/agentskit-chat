import { buildMessage } from '@agentskit/core'
import type { AdapterFactory } from '@agentskit/core'
import { render } from 'ink-testing-library'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { StandardComponentCatalog, defineComponentManifest } from '@agentskit/chat'
import type { ComponentRenderFrame } from '@agentskit/chat/protocol'
import { standardComponentFrameFixtures } from '../../protocol/src/fixtures.js'
import { AgentChat, StandardComponent } from '../src/index.js'

const manifest = defineComponentManifest(StandardComponentCatalog)
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const up = '\u001B[A'
const down = '\u001B[B'
const adapter: AdapterFactory = {
  createSource: () => ({ async *stream() { yield { type: 'done' } }, abort() {} }),
}

const fixture = (key: string): ComponentRenderFrame => standardComponentFrameFixtures.find(item => item.componentKey === key)!

const formFrame = (fields: readonly Record<string, unknown>[]): ComponentRenderFrame => ({
  ...fixture('form'), instanceId: 'multi-form', props: { title: 'Profile', fields, submitLabel: 'Save profile' },
})

describe('Ink standard components', () => {
  it('moves between terminal actions with the arrow keys', async () => {
    const onInteract = vi.fn()
    const view = render(<StandardComponent frame={fixture('confirmation')} manifest={manifest} onInteract={onInteract} />)
    view.stdin.write(up); await tick()
    view.stdin.write(down); await tick()
    view.stdin.write(down); await tick()
    view.stdin.write('\r'); await tick()
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'cancel' }))
    view.unmount()
  })

  it('keeps inactive and action-less components inert', async () => {
    const onInteract = vi.fn()
    const inactive = render(<StandardComponent frame={fixture('approval-request')} manifest={manifest} onInteract={onInteract} isActive={false} />)
    inactive.stdin.write('\r'); await tick()
    inactive.unmount()
    const display = render(<StandardComponent frame={fixture('progress')} manifest={manifest} onInteract={onInteract} />)
    display.stdin.write('\r'); await tick()
    expect(display.lastFrame()).toContain('42% — Uploading')
    display.unmount()
    expect(onInteract).not.toHaveBeenCalled()
  })

  it('renders optional catalog variants and the manifest fallback', () => {
    const onInteract = vi.fn()
    const frames: ComponentRenderFrame[] = [
      { ...fixture('progress'), props: { label: 'Upload', value: 10 } },
      { ...fixture('source-list'), props: { label: 'Sources', sources: [{ id: 'note', title: 'Note', snippet: 'Inline only' }] } },
      { ...fixture('link-card'), props: { title: 'Guide', href: 'https://example.com/guide', label: 'Visit' } },
      { ...fixture('error-notice'), props: { title: 'Failed', message: 'No retry.' } },
      { ...fixture('tool-call'), props: { name: 'Search', status: 'running' } },
      { ...fixture('file-attachment'), props: { name: 'notes.txt', mimeType: 'text/plain' } },
    ]
    const expected = ['10%', 'Note — Inline only', 'Visit', 'No retry.', 'running', 'text/plain']
    frames.forEach((frame, index) => {
      const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} isActive={false} />)
      expect(view.lastFrame()).toContain(expected[index])
      view.unmount()
    })
    const choice = render(<StandardComponent frame={fixture('choice-list')} manifest={manifest} onInteract={onInteract} />)
    expect(choice.lastFrame()).toBe('')
    choice.unmount()
  })

  it('collects text, checkbox and select fields in sequence', async () => {
    const onInteract = vi.fn()
    const frame = formFrame([
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'subscribe', label: 'Subscribe', type: 'checkbox' },
      { id: 'plan', label: 'Plan', type: 'select', options: [{ id: 'free', label: 'Free' }, { id: 'pro', label: 'Pro' }] },
    ])
    const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} />)
    expect(view.lastFrame()).toContain('Name *')
    view.stdin.write('\r'); await tick()
    expect(view.lastFrame()).not.toContain('Save profile')
    view.stdin.write('A'); await tick()
    view.stdin.write('x'); await tick()
    view.stdin.write('\u007F'); await tick()
    view.stdin.write('d'); await tick()
    view.stdin.write('a'); await tick()
    view.stdin.write('\r'); await tick()
    view.stdin.write(' '); await tick()
    expect(view.lastFrame()).toContain('[x]')
    view.stdin.write(' '); await tick()
    view.stdin.write(' '); await tick()
    view.stdin.write('\r'); await tick()
    expect(view.lastFrame()).toContain('Save profile')
    expect(view.lastFrame()).toContain('Free')
    view.stdin.write(down); await tick()
    expect(view.lastFrame()).toContain('Pro')
    view.stdin.write(down); await tick()
    view.stdin.write(up); await tick()
    view.stdin.write('\r'); await tick()
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'submit', value: { name: 'Ada', subscribe: true, plan: 'free' } }))
    view.unmount()
  })

  it('submits the first select option by default and ignores inactive forms', async () => {
    const onInteract = vi.fn()
    const frame = formFrame([{ id: 'plan', label: 'Plan', type: 'select', options: [{ id: 'free', label: 'Free' }, { id: 'pro', label: 'Pro' }] }])
    const inactive = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} isActive={false} />)
    inactive.stdin.write('\r'); await tick()
    expect(onInteract).not.toHaveBeenCalled()
    inactive.unmount()
    const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} />)
    view.stdin.write('\r'); await tick()
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'submit', value: { plan: 'free' } }))
    view.unmount()
  })

  it('surfaces a failing interaction callback and re-enables the component', async () => {
    const onComponentInteract = vi.fn(() => { throw new Error('Host rejected the interaction.') })
    const view = render(<AgentChat definition={{
      id: 'interaction-error', components: manifest,
      chat: { adapter, initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(fixture('confirmation')) })] },
    }} onComponentInteract={onComponentInteract} />)
    view.stdin.write('\r'); await tick()
    expect(view.lastFrame()).toContain('Host rejected the interaction.')
    view.stdin.write('\r'); await tick()
    expect(onComponentInteract).toHaveBeenCalledTimes(2)
    view.unmount()
  })
})
