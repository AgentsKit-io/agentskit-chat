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

const startApp = (): { readonly pty: IPty; readonly output: () => string } => {
  let buffer = ''
  const pty = spawn(process.execPath, ['dist/index.js'], {
    cwd: appDirectory,
    cols: 100,
    rows: 30,
    env: { ...process.env, TERM: 'xterm-256color' },
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

const submit = async (pty: IPty, value: string): Promise<void> => {
  pty.write(value)
  await new Promise(resolve => setTimeout(resolve, 25))
  pty.write('\r')
}

afterEach(() => {
  for (const pty of processes.splice(0)) pty.kill()
})

describe('Ink PTY host', () => {
  it('accepts a prompt and prints the deterministic streamed response', async () => {
    const app = startApp()
    await waitFor(app.output, 'Message AgentsKit')
    await submit(app.pty, 'hello')
    await waitFor(app.output, 'AgentsKit received: hello')
  })

  it('cancels a slow response with Escape without exiting', async () => {
    const app = startApp()
    await waitFor(app.output, 'Message AgentsKit')
    await submit(app.pty, '/slow')
    await waitFor(app.output, 'press Esc to stop')
    app.pty.write('\u001b')
    await waitFor(app.output, '↑/↓ to recall previous messages')
    await submit(app.pty, 'after')
    await waitFor(app.output, 'AgentsKit received: after')
    expect(app.pty.pid).toBeGreaterThan(0)
  })

  it('exits gracefully on Ctrl+C', async () => {
    const app = startApp()
    await waitFor(app.output, 'Message AgentsKit')
    const exited = new Promise<{ exitCode: number; signal?: number }>(resolve => app.pty.onExit(resolve))
    app.pty.write('\u0003')
    expect((await exited).exitCode).toBe(0)
  })
})
