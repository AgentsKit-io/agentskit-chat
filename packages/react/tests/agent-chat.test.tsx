import type { AdapterFactory } from '@agentskit/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentChat } from '../src/index.js'
import { commandRoute, defineChat } from '@agentskit/chat'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
