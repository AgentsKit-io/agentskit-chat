import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { killProcessTree, spawnNodeChild } from '@agentskit/cross-platform'
import { expect, it } from 'vitest'

const port = 8788

/** Boots the contract Worker in local workerd (no account, no deploy) and runs the RF-06 turn over HTTP. */
it('workerd request client: RF-06 complete metered turn with sessions, decisions, memory and cost in Postgres', async () => {
  // Wrangler keeps its config and logs under HOME; never touch the real one.
  const home = await mkdtemp(join(tmpdir(), 'wrangler-home-'))
  const wrangler = spawnNodeChild('pnpm', ['exec', 'wrangler', 'dev', '--config', 'tests/storage-pg/wrangler.jsonc', '--port', String(port), '--ip', '127.0.0.1', '--local'], {
    env: { ...process.env, HOME: home, XDG_CONFIG_HOME: home, WRANGLER_SEND_METRICS: 'false', CI: 'true' }, stdio: 'pipe',
  })
  let output = ''
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`wrangler dev did not start:\n${output}`)), 60000)
      const read = (chunk: Buffer): void => { output += chunk.toString(); if (/Ready on/.test(output)) { clearTimeout(timer); resolve() } }
      wrangler.stdout.on('data', read); wrangler.stderr.on('data', read)
      wrangler.once('exit', code => { clearTimeout(timer); reject(new Error(`wrangler dev exited with ${code}:\n${output}`)) })
    })
    const response = await fetch(`http://127.0.0.1:${port}/turn`)
    const body = await response.json() as { runtime?: string; criteria?: string[]; failed?: string }
    expect(body.failed).toBeUndefined()
    expect(response.status).toBe(200)
    expect(body.runtime).toBe('workerd-request-client')
    expect(body.criteria).toHaveLength(4)
    console.log(JSON.stringify(body))
  } finally {
    if (wrangler.pid !== undefined && wrangler.exitCode === null) await killProcessTree(wrangler.pid)
    await rm(home, { recursive: true, force: true })
  }
}, 120000)
