import { buildMessage, type AdapterFactory } from '@agentskit/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentChat, ChoiceList, StandardComponent, toChatCssVariables } from '../src/index.js'
import { ChoiceListComponent, StandardComponentCatalog, commandRoute, createCapabilityPolicy, createChatSession, defineChat, defineComponentManifest, withActionPolicy } from '@agentskit/chat'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, standardComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('remounts when the prepared session identity changes', () => {
  const definition = defineChat({ id: 'switch-session', chat: { adapter: adapter() } })
  const first = createChatSession(definition, { sessionId: 'customer-a' })
  const second = createChatSession(definition, { sessionId: 'customer-b' })
  const firstConfirmation = vi.spyOn(first, 'createConfirmation')
  const secondConfirmation = vi.spyOn(second, 'createConfirmation')
  const view = render(<AgentChat definition={definition} session={first} />)
  view.rerender(<AgentChat definition={definition} session={second} />)
  expect(firstConfirmation).toHaveBeenCalledOnce()
  expect(secondConfirmation).toHaveBeenCalledOnce()
})

it('rejects a prepared session after the definition revision changes', () => {
  const definition = defineChat({ id: 'revision-session', revision: 1, chat: { adapter: adapter() } })
  const session = createChatSession(definition, { sessionId: 'customer' })
  const view = render(<AgentChat definition={definition} session={session} />)
  expect(() => view.rerender(<AgentChat definition={{ ...definition, revision: 2 }} session={session} />)).toThrow('incompatible')
})

const adapter = (fail = false): AdapterFactory => ({
  createSource: request => ({
    async *stream() {
      if (fail) {
        yield { type: 'error', content: 'Test adapter failed' }
        return
      }
      const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
      yield { type: 'text', content: `Echo: ${prompt}` }
      yield { type: 'done' }
    },
    abort() {},
  }),
})

describe('AgentChat', () => {
  it('renders the complete standard catalog and emits validated interactions', () => {
    const manifest = defineComponentManifest(StandardComponentCatalog)
    const onInteract = vi.fn()
    for (const frame of standardComponentFrameFixtures.filter(item => item.componentKey !== 'choice-list')) {
      const view = render(<StandardComponent frame={frame} manifest={manifest} onInteract={onInteract} />)
      expect(view.container.querySelector(`[data-ak-component="${frame.componentKey}"]`)).toBeTruthy()
      view.unmount()
    }
    const button = standardComponentFrameFixtures[0]
    render(<StandardComponent frame={button} manifest={manifest} onInteract={onInteract} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ type: 'interact', event: 'select', value: 'save' }))
  })
  it('maps semantic tokens to upstream CSS variables and accepts a native slot', () => {
    expect(toChatCssVariables({ colors: { accent: '#663399' }, radius: { large: 20 } })).toMatchObject({
      '--ak-color-button': '#663399', '--ak-color-bubble-user': '#663399', '--ak-radius-lg': '20px',
    })
    const Slot = () => <p>Custom message slot</p>
    render(<AgentChat definition={{ id: 'slots', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } }} slots={{ Message: Slot }} />)
    expect(screen.getByText('Custom message slot')).toBeTruthy()
  })

  it('renders and selects a validated ChoiceList accessibly', () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const onSelect = vi.fn()
    render(<ChoiceList frame={validChoiceListFrame} manifest={manifest} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Documentation/ }))
    expect(screen.getByRole('group', { name: 'Where should we go?' })).toBeTruthy()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ type: 'select', choiceId: 'docs' }))
  })

  it('renders a deterministic-route frame inside the chat shell', async () => {
    const onComponentSelect = vi.fn()
    render(<AgentChat definition={defineChat({
      id: 'choices', chat: { adapter: adapter() }, components: defineComponentManifest([ChoiceListComponent]),
      conversation: {
        initial: 'idle', states: { idle: { on: { choose: 'done' } }, done: {} },
        routes: [commandRoute({ id: 'choose', command: '/choose', event: 'choose', response: () => JSON.stringify(validChoiceListFrame) })],
      },
    })} onComponentSelect={onComponentSelect} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '/choose' } })
    fireEvent.submit(input.closest('form')!)
    fireEvent.click(await screen.findByRole('button', { name: /Demo/ }))
    expect(onComponentSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'demo' }))
  })

  it('proposes and approves a typed choice action through AgentsKit confirmation', async () => {
    const execute = vi.fn()
    const actionableFrame = {
      ...validChoiceListFrame,
      props: {
        ...validChoiceListFrame.props,
        choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs'
          ? { ...choice, action: { name: 'open-docs', input: { path: '/guide' } } }
          : choice),
      },
    }
    render(<AgentChat onComponentSelect={() => { throw new Error('observer failed') }} definition={defineChat({
      id: 'action',
      components: defineComponentManifest([ChoiceListComponent]),
      chat: {
        adapter: adapter(),
        initialMessages: [{ id: 'choice', role: 'assistant', content: JSON.stringify(actionableFrame), status: 'complete', createdAt: new Date() }],
        tools: [{ name: 'open-docs', requiresConfirmation: true, execute, schema: { type: 'object' } }],
        validateArgs: (_schema, args) => ({ valid: args.path === '/guide' }),
      },
    })} />)

    const choice = screen.getByRole('button', { name: /Documentation/ })
    fireEvent.click(choice)
    fireEvent.click(choice)
    expect(await screen.findAllByRole('button', { name: 'Approve' })).toHaveLength(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(execute).toHaveBeenCalledOnce())
    expect(execute).toHaveBeenCalledWith({ path: '/guide' }, expect.anything())
  })

  it('preserves the coordinator across rerenders and denies an expired action', async () => {
    let clock = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
    const execute = vi.fn()
    const actionableFrame = {
      ...validChoiceListFrame,
      props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => (
        choice.id === 'docs' ? { ...choice, action: { name: 'open-docs', input: {} } } : choice
      )) },
    }
    render(<AgentChat actionConfirmationTtlMs={1} definition={defineChat({
      id: 'expiring-action', components: defineComponentManifest([ChoiceListComponent]),
      chat: {
        adapter: adapter(),
        initialMessages: [{ id: 'choice', role: 'assistant', content: JSON.stringify(actionableFrame), status: 'complete', createdAt: new Date() }],
        tools: [{ name: 'open-docs', requiresConfirmation: true, execute }],
      },
    })} />)
    fireEvent.click(screen.getByRole('button', { name: /Documentation/ }))
    const approve = await screen.findByRole('button', { name: 'Approve' })
    clock += 2
    fireEvent.click(approve)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull())
    expect(execute).not.toHaveBeenCalled()
  })

  it('shows safe guidance without confirmation when trusted policy denies an action', async () => {
    const execute = vi.fn()
    let trusted = false
    const actionableFrame = {
      ...validChoiceListFrame,
      props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs'
        ? { ...choice, action: { name: 'open-docs', input: {} } } : choice) },
    }
    const policy = createCapabilityPolicy({
      sessionId: 'session', getContext: () => trusted ? { sessionId: 'session', capabilities: ['docs.open'] } : undefined,
      requirements: { 'open-docs': ['docs.open'] },
    })
    render(<AgentChat definition={defineChat({
      id: 'policy-denied', components: defineComponentManifest([ChoiceListComponent]),
      chat: withActionPolicy({
        adapter: adapter(),
        initialMessages: [{ id: 'choice', role: 'assistant', content: JSON.stringify(actionableFrame), status: 'complete', createdAt: new Date() }],
        tools: [{ name: 'open-docs', requiresConfirmation: true, execute }],
      }, policy),
    })} />)
    fireEvent.click(screen.getByRole('button', { name: /Documentation/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('missing-context'))
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    trusted = true
    fireEvent.click(screen.getByRole('button', { name: /Documentation/ }))
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(execute).not.toHaveBeenCalled()
  })

  it('shows fallback and emits nothing for unknown or invalid component props', () => {
    const onSelect = vi.fn()
    const manifest = defineComponentManifest([ChoiceListComponent])
    const { rerender } = render(<ChoiceList frame={invalidChoiceListPropsFrame} manifest={manifest} onSelect={onSelect} />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<AgentChat definition={{
      id: 'unknown', components: manifest,
      chat: { adapter: adapter(), initialMessages: [{ id: 'unknown', role: 'assistant', content: JSON.stringify(unknownComponentFrame), status: 'complete', createdAt: new Date() }] },
    }} onComponentSelect={onSelect} />)
    expect(screen.getByText('[unsupported visual: choice-list] Choose Documentation or Demo.')).toBeTruthy()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps an invalid component envelope out of the transcript', () => {
    const content = JSON.stringify(invalidComponentFrameFixtures[1].frame)
    render(<AgentChat definition={{
      id: 'invalid-frame', chat: { adapter: adapter(), initialMessages: [{ id: 'invalid', role: 'assistant', content, status: 'complete', createdAt: new Date() }] },
    }} />)
    expect(screen.getByRole('alert').textContent).toBe('Component frame uses an unsupported version.')
    expect(screen.queryByText(content)).toBeNull()
  })

  it('keeps conversation progress when a parent recreates the same definition', async () => {
    const makeDefinition = (fallback: string) => defineChat({
      id: 'stable-session', chat: { adapter: {
        createSource: () => ({ async *stream() { yield { type: 'text' as const, content: fallback }; yield { type: 'done' as const } }, abort() {} }),
      } },
      conversation: {
        initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} },
        routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })],
      },
    })
    const view = render(<AgentChat definition={makeDefinition('Old adapter')} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '/start' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText('Started')).toBeTruthy()

    view.rerender(<AgentChat definition={makeDefinition('Updated adapter')} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/start' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText('Updated adapter')).toBeTruthy()
  })

  it('submits through the upstream React binding and renders the streamed answer', async () => {
    render(<AgentChat definition={{ id: 'demo', chat: { adapter: adapter() } }} placeholder="Ask" />)

    fireEvent.change(screen.getByPlaceholderText('Ask'), { target: { value: 'hello' } })
    fireEvent.submit(screen.getByPlaceholderText('Ask').closest('form')!)

    expect(await screen.findByText('Echo: hello')).toBeTruthy()
  })

  it('surfaces upstream adapter errors accessibly', async () => {
    render(<AgentChat definition={{ id: 'demo', chat: { adapter: adapter(true) } }} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'fail' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Test adapter failed'))
  })

  it('announces the transcript and prevents overlapping sends while streaming', async () => {
    let finish = () => {}
    const pending = new Promise<void>(resolve => { finish = resolve })
    const streaming: AdapterFactory = {
      createSource: () => ({
        async *stream() {
          yield { type: 'text', content: 'Working' }
          await pending
          yield { type: 'text', content: 'Late chunk' }
          yield { type: 'done' }
        },
        abort: finish,
      }),
    }
    render(<AgentChat definition={{ id: 'demo', chat: { adapter: streaming } }} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByText('Working')).toBeTruthy()
    expect(screen.getByRole('log').getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull())
    expect(screen.queryByText('Late chunk')).toBeNull()
  })

  it('delegates retry, regenerate, and edit to the upstream lifecycle', async () => {
    let calls = 0
    const lifecycleAdapter: AdapterFactory = {
      createSource: request => ({
        async *stream() {
          calls += 1
          yield { type: 'text', content: `Run ${calls}: ${request.messages.at(-1)?.content ?? ''}` }
          yield { type: 'done' }
        },
        abort() {},
      }),
    }
    render(<AgentChat definition={{ id: 'lifecycle', chat: {
      adapter: lifecycleAdapter,
      initialMessages: [buildMessage({ role: 'user', content: 'original' }), buildMessage({ role: 'assistant', content: 'answer' })],
    } }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry response' }))
    await waitFor(() => expect(calls).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate response' }))
    await waitFor(() => expect(calls).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Edit last message' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit message' }), { target: { value: 'changed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }))
    await waitFor(() => expect(calls).toBe(3))
    expect(screen.getByText('changed')).toBeTruthy()
  })

  it('starts a fresh upstream controller when the definition identity changes', async () => {
    const view = render(<AgentChat definition={{ id: 'first', chat: { adapter: adapter() } }} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'first message' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText('Echo: first message')).toBeTruthy()

    view.rerender(<AgentChat definition={{ id: 'second', chat: { adapter: adapter() } }} />)

    expect(screen.queryByText('first message')).toBeNull()
    expect(screen.getByLabelText('second chat')).toBeTruthy()
  })
})
