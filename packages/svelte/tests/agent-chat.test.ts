import { buildMessage, type AdapterFactory } from '@agentskit/core'
import { ChoiceListComponent, StandardComponentCatalog, commandRoute, createChatSession, defineChat, defineComponentManifest } from '@agentskit/chat'
import { fireEvent, render, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidComponentFrameFixtures, standardComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import AgentChat from '../src/AgentChat.svelte'
import ChoiceList from '../src/ChoiceList.svelte'
import StandardComponent from '../src/StandardComponent.svelte'
import { toChatCssVariables, toChatStyle } from '../src/index.js'
import SlotsFixture from './SlotsFixture.svelte'

const adapter = (fail = false): AdapterFactory => ({ createSource: request => ({ async *stream() {
  if (fail) { yield { type: 'error', content: 'Test adapter failed' }; return }
  const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
  yield { type: 'text', content: `Echo: ${prompt}` }; yield { type: 'done' }
}, abort() {} }) })

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

describe('AgentChat Svelte', () => {
  it('renders the complete standard catalog and emits interactions', async () => {
    const manifest = defineComponentManifest(StandardComponentCatalog); const onInteract = vi.fn()
    for (const frame of standardComponentFrameFixtures.filter(item => item.componentKey !== 'choice-list')) {
      const view = render(StandardComponent, { props: { frame, manifest, onInteract } })
      expect(view.container.querySelector(`[data-ak-component="${frame.componentKey}"]`)).toBeTruthy(); view.unmount()
    }
    const view = render(StandardComponent, { props: { frame: standardComponentFrameFixtures[0], manifest, onInteract } })
    await fireEvent.click(view.getByText('Save')); expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ event: 'select', value: 'save' }))
  })
  it('remounts when the prepared session identity changes', async () => {
    const definition = defineChat({ id: 'switch-session', chat: { adapter: adapter() } })
    const first = createChatSession(definition, { sessionId: 'customer-a' })
    const second = createChatSession(definition, { sessionId: 'customer-b' })
    const firstConfirmation = vi.spyOn(first, 'createConfirmation')
    const secondConfirmation = vi.spyOn(second, 'createConfirmation')
    const view = render(AgentChat, { props: { definition, session: first } })
    await view.rerender({ definition, session: second })
    expect(firstConfirmation).toHaveBeenCalledOnce()
    expect(secondConfirmation).toHaveBeenCalledOnce()
  })

  it('rejects a prepared session after the definition revision changes', async () => {
    const definition = defineChat({ id: 'revision-session', revision: 1, chat: { adapter: adapter() } })
    const session = createChatSession(definition, { sessionId: 'customer' })
    const view = render(AgentChat, { props: { definition, session } })
    await expect(view.rerender({ definition: { ...definition, revision: 2 }, session })).rejects.toThrow('incompatible')
  })

  it('maps semantic theme tokens to CSS variables', () => {
    expect(toChatCssVariables({ colors: { accent: '#663399' }, radius: { large: 20 } })).toMatchObject({ '--ak-color-button': '#663399', '--ak-radius-lg': '20px' })
    expect(toChatStyle({ colors: { accent: '#663399' } })).toContain('--ak-color-button:#663399')
    expect(toChatCssVariables({ fontFamily: 'Atkinson Hyperlegible' })['--ak-font-family']).toBe('Atkinson Hyperlegible')
  })

  it('renders and selects an accessible ChoiceList', async () => {
    const onSelect = vi.fn()
    const view = render(ChoiceList, { props: { frame: validChoiceListFrame, manifest: defineComponentManifest([ChoiceListComponent]), onSelect } })
    expect(view.container.querySelector('fieldset')?.getAttribute('aria-label')).toBe('Where should we go?')
    await fireEvent.click(view.getByRole('button', { name: /Documentation/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'docs' }))
    const invalid = render(ChoiceList, { props: { frame: null, manifest: defineComponentManifest([ChoiceListComponent]), onSelect } })
    expect(invalid.container.querySelector('fieldset')).toBeNull()
  })

  it('submits through the upstream store and renders hello world', async () => {
    const view = render(AgentChat, { props: { definition: { id: 'hello', chat: { adapter: adapter() } }, placeholder: 'Ask' } })
    const input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: 'hello' } })
    await fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(view.getByText('Echo: hello')).toBeTruthy())
  })

  it('runs a deterministic ChoiceList and deduplicates selection', async () => {
    const selected = vi.fn()
    const view = render(AgentChat, { props: { onComponentSelect: selected, definition: defineChat({
      id: 'choices', chat: { adapter: adapter() }, components: defineComponentManifest([ChoiceListComponent]),
      conversation: { initial: 'idle', states: { idle: { on: { choose: 'done' } }, done: {} }, routes: [commandRoute({ id: 'choose', command: '/choose', event: 'choose', response: () => JSON.stringify(validChoiceListFrame) })] },
    }) } })
    const input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: '/choose' } }); await fireEvent.submit(input.closest('form')!)
    const choice = await view.findByRole('button', { name: /Documentation/ })
    await fireEvent.click(choice); await fireEvent.click(choice)
    expect(selected).toHaveBeenCalledOnce(); expect((choice as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders shared fallback and invalid diagnostics inertly', () => {
    const view = render(AgentChat, { props: { definition: { id: 'fallback', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(unknownComponentFrame) }), buildMessage({ role: 'assistant', content: JSON.stringify(invalidComponentFrameFixtures[1]!.frame) })] } } } })
    expect(view.container.querySelector('[data-ak-component-fallback]')).toBeTruthy()
    expect(view.container.querySelector('[data-ak-component-diagnostic]')).toBeTruthy()
  })

  it('surfaces upstream errors as alerts', async () => {
    const view = render(AgentChat, { props: { definition: { id: 'error', chat: { adapter: adapter(true) } } } })
    const input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: 'fail' } }); await fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Test adapter failed'))
  })

  it('proposes and approves a typed choice action', async () => {
    const execute = vi.fn()
    const frame = { ...validChoiceListFrame, props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs' ? { ...choice, action: { name: 'open-docs', input: { path: '/guide' } } } : choice) } }
    const view = render(AgentChat, { props: { actionConfirmationTtlMs: 10_000, definition: defineChat({ id: 'action', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(frame) })], tools: [{ name: 'open-docs', requiresConfirmation: true, execute, schema: { type: 'object' } }], validateArgs: (_schema, args) => ({ valid: args.path === '/guide' }) } }) } })
    await fireEvent.click(view.getByRole('button', { name: /Documentation/ }))
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(execute).toHaveBeenCalledOnce())
  })

  it('denies a typed choice action through the coordinator', async () => {
    const frame = { ...validChoiceListFrame, props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs' ? { ...choice, action: { name: 'open-docs', input: {} } } : choice) } }
    const view = render(AgentChat, { props: { definition: defineChat({ id: 'deny', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(frame) })], tools: [{ name: 'open-docs', requiresConfirmation: true, execute: vi.fn(), schema: { type: 'object' } }] } }) } })
    await fireEvent.click(view.getByRole('button', { name: /Documentation/ }))
    await fireEvent.click(await view.findByRole('button', { name: 'Deny' }))
    await waitFor(() => expect(view.queryByRole('button', { name: 'Deny' })).toBeNull())
  })

  it('routes edit, retry, and regenerate through upstream actions', async () => {
    const view = render(AgentChat, { props: { definition: { id: 'lifecycle', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'user', content: 'old' }), buildMessage({ role: 'assistant', content: 'Echo: old' })] } } } })
    await fireEvent.click(view.getByRole('button', { name: 'Retry response' })); await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull())
    await fireEvent.click(view.getByRole('button', { name: 'Regenerate response' })); await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull())
    await fireEvent.click(view.getByRole('button', { name: 'Edit last message' }))
    const edit = view.getByRole('textbox', { name: 'Edit message' }) as HTMLInputElement
    await fireEvent.input(edit, { target: { value: 'updated' } }); await fireEvent.submit(edit.closest('form')!)
    await waitFor(() => expect(view.getByText('Echo: updated')).toBeTruthy())
  })

  it('uses the newest adapter after a settled config replacement', async () => {
    const make = (answer: string) => defineChat({ id: 'config', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: answer }; yield { type: 'done' as const } }, abort() {} }) } } })
    const view = render(AgentChat, { props: { definition: make('Old') } })
    await view.rerender({ definition: make('Updated') })
    const input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: 'hello' } }); await fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(view.getByText('Updated')).toBeTruthy())
  })

  it('cancels an active stream before replacing its store binding', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    const abort = vi.fn(() => release?.())
    const old = defineChat({ id: 'stream-swap', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: 'Old start' }; await gate; yield { type: 'text' as const, content: ' old end' }; yield { type: 'done' as const } }, abort }) } } })
    const updated = defineChat({ id: 'stream-swap', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: 'Updated' }; yield { type: 'done' as const } }, abort() {} }) } } })
    const view = render(AgentChat, { props: { definition: old } })
    let input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: 'first' } }); await fireEvent.submit(input.closest('form')!); await view.findByText('Old start')
    await view.rerender({ definition: updated }); await waitFor(() => expect(abort).toHaveBeenCalledOnce())
    input = view.getByRole('textbox') as HTMLTextAreaElement
    await fireEvent.input(input, { target: { value: 'second' } }); await fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(view.getByText('Updated')).toBeTruthy())
  })

  it('keeps a selected ChoiceList disabled across config replacement', async () => {
    const selected = vi.fn()
    const make = () => defineChat({ id: 'resolved', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(validChoiceListFrame) })] } })
    const view = render(AgentChat, { props: { definition: make(), onComponentSelect: selected } })
    await fireEvent.click(view.getByRole('button', { name: /Documentation/ }))
    await view.rerender({ definition: make(), onComponentSelect: selected })
    const choice = view.getByRole('button', { name: /Documentation/ }) as HTMLButtonElement
    expect(choice.disabled).toBe(true); await fireEvent.click(choice); expect(selected).toHaveBeenCalledOnce()
  })

  it('renders Svelte-native customization snippets', () => {
    const view = render(SlotsFixture, { props: { definition: { id: 'slots', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } } } })
    expect(view.container.querySelector('[data-slot="container"]')).toBeTruthy()
    expect(view.container.querySelector('[data-slot="message"]')?.textContent).toBe('hello')
    expect(view.container.querySelector('[data-slot="input"]')).toBeTruthy()
    expect(view.container.querySelector('[data-slot="thinking"]')).toBeTruthy()
  })
})
