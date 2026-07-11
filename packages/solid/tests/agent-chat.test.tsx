import { buildMessage, type AdapterFactory } from '@agentskit/core'
import { ChoiceListComponent, commandRoute, createChatSession, defineChat, defineComponentManifest } from '@agentskit/chat'
import { fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { AgentChat, ChoiceList, toChatCssVariables } from '../src/index.js'

const adapter = (fail = false): AdapterFactory => ({ createSource: request => ({ async *stream() {
  if (fail) { yield { type: 'error', content: 'Test adapter failed' }; return }
  const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
  yield { type: 'text', content: `Echo: ${prompt}` }; yield { type: 'done' }
}, abort() {} }) })
const submit = async (root: HTMLElement, value: string): Promise<void> => {
  const input = root.querySelector('textarea') as HTMLTextAreaElement
  await fireEvent.input(input, { target: { value } }); await fireEvent.submit(input.closest('form')!)
}
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

describe('AgentChat Solid', () => {
  it('maps semantic tokens and accepts native render props', () => {
    expect(toChatCssVariables({ colors: { accent: '#663399' }, radius: { large: 20 } })).toMatchObject({ '--ak-color-button': '#663399', '--ak-radius-lg': '20px' })
    const view = render(() => <AgentChat definition={{ id: 'native', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } }} message={message => <strong data-custom-message>Solid: {message.content}</strong>} container={children => <main data-custom-container>{children}</main>} input={() => <label>custom input</label>} />)
    expect(view.container.querySelector('[data-custom-container]')).toBeTruthy(); expect(view.container.textContent).toContain('Solid: hello'); expect(view.container.textContent).toContain('custom input')
  })

  it('updates presentation props for existing messages without resetting chat state', async () => {
    const initial = buildMessage({ role: 'assistant', content: 'hello' })
    const [custom, setCustom] = createSignal(false)
    const view = render(() => <AgentChat definition={{ id: 'presentation', chat: { adapter: adapter(), initialMessages: [initial] } }} {...(custom() ? { message: (message: typeof initial) => <strong data-updated-message>{message.content}</strong> } : {})} />)
    expect(view.container.querySelector('[data-ak-message]')).toBeTruthy()
    setCustom(true)
    await waitFor(() => expect(view.container.querySelector('[data-updated-message]')?.textContent).toBe('hello'))
  })

  it('renders and selects a validated ChoiceList accessibly', async () => {
    const onSelect = vi.fn(); const view = render(() => <ChoiceList frame={validChoiceListFrame} manifest={defineComponentManifest([ChoiceListComponent])} onSelect={onSelect} />)
    expect(view.container.querySelector('fieldset')?.getAttribute('aria-label')).toBe('Where should we go?')
    await fireEvent.click(view.getByRole('button', { name: /Documentation/ })); expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'docs' }))
  })

  it('executes hello world and deterministic ChoiceList flows', async () => {
    const selected = vi.fn(); const definition = defineChat({ id: 'flow', chat: { adapter: adapter() }, components: defineComponentManifest([ChoiceListComponent]), conversation: { initial: 'idle', states: { idle: { on: { choose: 'done' } }, done: {} }, routes: [commandRoute({ id: 'choose', command: '/choose', event: 'choose', response: () => JSON.stringify(validChoiceListFrame) })] } })
    const hello = render(() => <AgentChat definition={definition} onComponentSelect={selected} />)
    await submit(hello.container, 'hello'); await waitFor(() => expect(hello.container.textContent).toContain('Echo: hello')); hello.unmount()
    const view = render(() => <AgentChat definition={definition} onComponentSelect={selected} />)
    await submit(view.container, '/choose'); const choice = await view.findByRole('button', { name: /Documentation/ }); await fireEvent.click(choice); await fireEvent.click(choice)
    expect(selected).toHaveBeenCalledOnce(); expect((choice as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders semantic fallbacks and invalid diagnostics inertly', () => {
    const manifest = defineComponentManifest([ChoiceListComponent]); const frames = [unknownComponentFrame, invalidChoiceListPropsFrame, invalidComponentFrameFixtures[1]!.frame]
    const view = render(() => <AgentChat definition={{ id: 'fallbacks', components: manifest, chat: { adapter: adapter(), initialMessages: frames.map(frame => buildMessage({ role: 'assistant', content: JSON.stringify(frame) })) } }} />)
    expect(view.container.querySelector('[data-ak-component-fallback]')).toBeTruthy(); expect(view.container.querySelector('[data-ak-component-diagnostic]')).toBeTruthy()
  })

  it('remounts for prepared session identity and rejects incompatible revisions', async () => {
    const definition = defineChat({ id: 'session', revision: 1, chat: { adapter: adapter() } }); const first = createChatSession(definition, { sessionId: 'one' }); const second = createChatSession(definition, { sessionId: 'two' })
    const firstSpy = vi.spyOn(first, 'createConfirmation'); const secondSpy = vi.spyOn(second, 'createConfirmation'); const [session, setSession] = createSignal(first)
    render(() => <AgentChat definition={definition} session={session()} />); expect(firstSpy).toHaveBeenCalledOnce(); setSession(second); await waitFor(() => expect(secondSpy).toHaveBeenCalledOnce())
    const [revision, setRevision] = createSignal(1); const incompatible = render(() => <AgentChat definition={{ ...definition, revision: revision() }} session={first} />)
    expect(() => setRevision(2)).toThrow('incompatible'); incompatible.unmount()
  })

  it('surfaces adapter failures as accessible alerts', async () => {
    const view = render(() => <AgentChat definition={{ id: 'error', chat: { adapter: adapter(true) } }} />); await submit(view.container, 'fail')
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Test adapter failed'))
  })

  it('proposes, approves, denies, and deduplicates typed actions', async () => {
    const execute = vi.fn(); const frame = { ...validChoiceListFrame, props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs' ? { ...choice, action: { name: 'open-docs', input: { path: '/guide' } } } : choice) } }
    const definition = defineChat({ id: 'action', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(frame) })], tools: [{ name: 'open-docs', requiresConfirmation: true, execute, schema: { type: 'object' } }], validateArgs: (_schema, args) => ({ valid: args.path === '/guide' }) } })
    const view = render(() => <AgentChat actionConfirmationTtlMs={10_000} definition={definition} />)
    const choice = view.getByRole('button', { name: /Documentation/ }); await fireEvent.click(choice); await fireEvent.click(choice)
    await fireEvent.click(await view.findByRole('button', { name: 'Approve' })); await waitFor(() => expect(execute).toHaveBeenCalledOnce())
  })

  it('routes retry, regenerate, and edit through upstream lifecycle', async () => {
    const view = render(() => <AgentChat placeholder="Ask" definition={{ id: 'lifecycle', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'user', content: 'old' }), buildMessage({ role: 'assistant', content: 'Echo: old' })] } }} />)
    expect((view.container.querySelector('textarea') as HTMLTextAreaElement).placeholder).toBe('Ask')
    await fireEvent.click(view.getByRole('button', { name: 'Retry response' })); await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull())
    await fireEvent.click(view.getByRole('button', { name: 'Regenerate response' })); await waitFor(() => expect(view.queryByRole('button', { name: 'Stop' })).toBeNull())
    await fireEvent.click(view.getByRole('button', { name: 'Edit last message' })); const edit = view.getByRole('textbox', { name: 'Edit message' }) as HTMLInputElement
    await fireEvent.input(edit, { target: { value: 'updated' } }); await fireEvent.submit(edit.closest('form')!); await waitFor(() => expect(view.container.textContent).toContain('Echo: updated'))
  })

  it('replaces config immediately, preserves history, and aborts an active source', async () => {
    let release: (() => void) | undefined; const gate = new Promise<void>(resolve => { release = resolve }); const abort = vi.fn(() => release?.())
    const old = defineChat({ id: 'swap', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: 'Old start' }; await gate; yield { type: 'done' as const } }, abort }) } } })
    const updated = defineChat({ id: 'swap', chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: 'Updated' }; yield { type: 'done' as const } }, abort() {} }) } } })
    const [definition, setDefinition] = createSignal<ReturnType<typeof defineChat>>(old); const view = render(() => <AgentChat definition={definition()} />)
    await submit(view.container, 'first'); await view.findByText('Old start'); setDefinition(updated); await waitFor(() => expect(abort).toHaveBeenCalledOnce())
    await submit(view.container, 'second'); await waitFor(() => expect(view.container.textContent).toContain('Updated')); expect(view.container.textContent).toContain('first')
  })

  it('keeps resolved ChoiceList state across config replacement', async () => {
    const selected = vi.fn(); const make = () => defineChat({ id: 'resolved', components: defineComponentManifest([ChoiceListComponent]), chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(validChoiceListFrame) })] } })
    const [definition, setDefinition] = createSignal(make()); const view = render(() => <AgentChat definition={definition()} onComponentSelect={selected} />); const choice = view.getByRole('button', { name: /Documentation/ }) as HTMLButtonElement
    await fireEvent.click(choice); setDefinition(make()); await waitFor(() => expect((view.getByRole('button', { name: /Documentation/ }) as HTMLButtonElement).disabled).toBe(true)); expect(selected).toHaveBeenCalledOnce()
  })
})
