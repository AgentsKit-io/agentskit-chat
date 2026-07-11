import type { AdapterFactory } from '@agentskit/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentChat } from '../src/index.js'

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
})
