import path from 'node:path'
import process from 'node:process'
import { chmodSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { spawn, type IPty } from 'node-pty'
import { afterEach, describe, expect, it } from 'vitest'

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const processes: IPty[] = []

if (process.platform === 'darwin') {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.resolve('node-pty'))), '..')
  chmodSync(path.join(packageRoot, 'prebuilds', `darwin-${process.arch}`, 'spawn-helper'), 0o755)
}

const startApp = (example?: string): { readonly pty: IPty; readonly output: () => string } => {
  let buffer = ''
  const pty = spawn(process.execPath, ['dist/index.js'], {
    cwd: appDirectory,
    cols: 100,
    rows: 30,
    env: { ...process.env, TERM: 'xterm-256color', ...(example ? { AK_EXAMPLE: example } : {}) },
  })
  pty.onData(data => { buffer += data })
  processes.push(pty)
  return { pty, output: () => buffer }
}

const waitFor = async (read: () => string, text: string): Promise<void> => {
  const deadline = Date.now() + 5_000
  while (!read().includes(text)) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${JSON.stringify(text)} in ${JSON.stringify(read())}`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

const occurrences = (value: string, text: string): number => value.split(text).length - 1

const waitForAnother = async (read: () => string, text: string, before: number): Promise<void> => {
  const deadline = Date.now() + 5_000
  while (occurrences(read(), text) <= before) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for another ${JSON.stringify(text)}`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

const submit = async (pty: IPty, value: string): Promise<void> => {
  pty.write(value)
  await new Promise(resolve => setTimeout(resolve, 25))
  pty.write('\r')
}

afterEach(() => {
  for (const pty of processes.splice(0)) pty.kill()
})

describe('Ink PTY host', () => {
  it('advances the shared deterministic conversation', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    await submit(app.pty, '/start')
    await waitFor(app.output, 'What is your name?')
    await submit(app.pty, '/name Ada')
    await waitFor(app.output, 'Welcome, Ada.')
  })

  it('accepts a prompt and prints the deterministic streamed response', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    await submit(app.pty, 'hello')
    await waitFor(app.output, 'AgentsKit received: hello')
  })

  it('cancels a slow response with Escape without exiting', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    await submit(app.pty, '/slow')
    await waitFor(app.output, 'press Esc to stop')
    app.pty.write('\u001b')
    await waitFor(app.output, '↑/↓ to recall previous messages')
    await submit(app.pty, 'after')
    await waitFor(app.output, 'AgentsKit received: after')
    expect(app.pty.pid).toBeGreaterThan(0)
  })

  it('retries, regenerates, and edits through lifecycle commands', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    await submit(app.pty, 'before-edit')
    await waitFor(app.output, 'AgentsKit received: before-edit')
    let before = occurrences(app.output(), 'AgentsKit received: before-edit')
    await submit(app.pty, '/retry')
    await waitForAnother(app.output, 'AgentsKit received: before-edit', before)
    before = occurrences(app.output(), 'AgentsKit received: before-edit')
    await submit(app.pty, '/regenerate')
    await waitForAnother(app.output, 'AgentsKit received: before-edit', before)
    await submit(app.pty, '/edit after-edit')
    await waitFor(app.output, 'AgentsKit received: after-edit')
  })

  it('exits gracefully on Ctrl+C', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    const exited = new Promise<{ exitCode: number; signal?: number }>(resolve => app.pty.onExit(resolve))
    app.pty.write('\u0003')
    expect((await exited).exitCode).toBe(0)
  })

  it('opens a support ticket only after terminal confirmation', async () => {
    const app = startApp()
    await waitFor(app.output, 'Ask support or type /support')
    await submit(app.pty, '/support')
    await waitFor(app.output, 'Open support ticket')
    app.pty.write('\r')
    await waitFor(app.output, 'Allow create-support-ticket?')
    app.pty.write('1')
    await waitFor(app.output, 'SUP-')
  }, 15_000)

  it('completes onboarding with keyboard-only form and confirmation controls', async () => {
    const app = startApp('onboarding')
    await waitFor(app.output, 'Type /onboarding to begin')
    await submit(app.pty, '/onboarding')
    await waitFor(app.output, 'Primary role')
    app.pty.write('\r')
    await new Promise(resolve => setTimeout(resolve, 50))
    app.pty.write('Automate handoffs')
    app.pty.write('\r')
    await new Promise(resolve => setTimeout(resolve, 200))
    await submit(app.pty, '/recommend')
    await waitFor(app.output, 'engineering starter')
    app.pty.write('\r')
    await new Promise(resolve => setTimeout(resolve, 200))
    await submit(app.pty, '/accept')
    await waitFor(app.output, 'Complete onboarding')
    app.pty.write('\r')
    await waitFor(app.output, 'Allow complete-onboarding?')
    app.pty.write('1')
    await waitFor(app.output, 'Onboarding confirmed.')
    app.pty.write('\u007f')
    await submit(app.pty, '/done')
    await waitFor(app.output, 'Onboarding complete. Your guided workspace is ready.')
  }, 20_000)

  it('confirms a protected operation with keyboard controls', async () => {
    const app = startApp('operations')
    await waitFor(app.output, 'Type /operations to begin')
    await submit(app.pty, '/operations')
    await waitFor(app.output, 'Restart operation')
    app.pty.write('\u001b[B')
    app.pty.write('\r')
    await waitFor(app.output, 'Allow restart-operation?')
    app.pty.write('1')
    await waitFor(app.output, 'checkout-api restarted')
  }, 15_000)

  it('renders a grounded answer and source fallback', async () => {
    const app = startApp('rag')
    await waitFor(app.output, 'Ask a grounded question')
    await submit(app.pty, 'How does AgentsKit Chat work?')
    await waitFor(app.output, 'AgentsKit Chat overview')
    await waitFor(app.output, 'Grounded answer')
    app.pty.write('\r')
    await waitFor(app.output, 'Source: https://www.agentskit.io/docs/chat')
  })
})
