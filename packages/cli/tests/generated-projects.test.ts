import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { promisify } from 'node:util'
import { spawn } from 'node-pty'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const execute = promisify(execFile)
const workspace = path.resolve(import.meta.dirname, '../../..')
const roots: string[] = []
const run = async (command: string, args: readonly string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> => {
  try { return await execute(command, [...args], { cwd, env: { ...process.env, ...env } }) }
  catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string }
    throw new Error(`${failure.message}\n${failure.stdout ?? ''}\n${failure.stderr ?? ''}`)
  }
}

beforeAll(async () => {
  await execute('pnpm', ['--filter', '@agentskit/chat-protocol', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-server', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-react', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-react-native', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-ink', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-vue', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-svelte', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-solid', 'build'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-angular', 'build'], { cwd: workspace })
  await execute('node', ['scripts/assemble-chat-package.mjs'], { cwd: workspace })
  await execute('pnpm', ['--filter', '@agentskit/chat-cli', 'build'], { cwd: workspace })
}, 60_000)

afterAll(async () => Promise.all(roots.map(root => rm(root, { recursive: true, force: true }))))

describe('generated projects', () => {
  it('reports manifest version, help, and rejects extra positionals through the real bin', async () => {
    const bin = path.join(workspace, 'packages/cli/dist/bin.js')
    const manifest = JSON.parse(await readFile(path.join(workspace, 'packages/cli/package.json'), 'utf8')) as { version: string }
    expect((await run('node', [bin, '--version'], workspace)).stdout.trim()).toBe(manifest.version)
    expect((await run('node', [bin, '--help'], workspace)).stdout).toContain('agentskit-chat init')
    expect((await run('node', [bin, 'completion', 'bash'], workspace)).stdout).toContain('react-native')
    await expect(run('node', [bin, 'init', 'one', 'two', '--renderer', 'react'], workspace)).rejects.toThrow('at most one target')
    await expect(run('node', [bin, 'init', '--directory', 'ignored', '--renderer', 'react'], workspace)).rejects.toThrow('only valid with add component')
  })

  it('detects the host renderer before prompting on a TTY', async () => {
    const host = path.join(workspace, 'apps', `cli-fixture-detection-${randomUUID()}`); roots.push(host)
    await mkdir(host, { recursive: true })
    await writeFile(path.join(host, 'package.json'), JSON.stringify({ dependencies: { react: '^19' } }), { flag: 'wx' })
    const target = path.join(host, 'generated')
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('node', [path.join(workspace, 'packages/cli/dist/bin.js'), 'init', target], { cwd: host })
      let value = ''
      const timeout = setTimeout(() => { child.kill(); reject(new Error(`CLI did not exit: ${value}`)) }, 5_000)
      child.onData(chunk => { value += chunk })
      child.onExit(({ exitCode }) => { clearTimeout(timeout); exitCode === 0 ? resolve(value) : reject(new Error(value)) })
    })
    expect(output).not.toContain('Renderer (')
    expect(output).toContain('"ok":true')
  })

  it('adds and type-checks one semantic component across selected targets', async () => {
    const root = path.join(workspace, 'apps', `cli-fixture-component-${randomUUID()}`); roots.push(root)
    await mkdir(root, { recursive: true })
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'component-fixture', private: true, type: 'module', dependencies: { '@agentskit/chat': 'workspace:*', '@types/react': '^19.0.0', ink: '^7.0.0', react: '^19.0.0', vue: '^3.5.0', zod: '^4.0.0' } }))
    await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true }, include: ['src'] }))
    const command = await run('node', [path.join(workspace, 'packages/cli/dist/bin.js'), 'add', 'component', 'status-card', '--renderer', 'react,vue,ink', '--directory', root, '--yes'], workspace)
    expect(JSON.parse(command.stdout)).toMatchObject({ ok: true })
    await run('pnpm', ['install', '--lockfile=false'], workspace)
    await run('pnpm', ['exec', 'tsc', '--noEmit'], root)
  }, 120_000)

  it.each(['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular'] as const)('installs, type-checks, and tests %s', async renderer => {
    const root = path.join(workspace, 'apps', `cli-fixture-${renderer}-${randomUUID()}`); roots.push(root)
    const command = await run('node', [path.join(workspace, 'packages/cli/dist/bin.js'), 'init', root, '--renderer', renderer, '--yes'], workspace)
    expect(JSON.parse(command.stdout)).toMatchObject({ ok: true })
    await run('node', [path.join(workspace, 'packages/cli/dist/bin.js'), 'add', 'component', 'status-card', '--renderer', renderer, '--directory', root, '--yes'], workspace)
    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; scripts: Record<string, string> }
    for (const name of Object.keys(manifest.dependencies)) if (name.startsWith('@agentskit/chat')) manifest.dependencies[name] = 'workspace:*'
    await writeFile(path.join(root, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await run('pnpm', ['install', '--lockfile=false'], workspace)
    await run('pnpm', ['typecheck'], root)
    const result = await run('pnpm', ['test'], root)
    expect(result.stdout).toContain('passed')
    if (manifest.scripts.build) await run('pnpm', ['build'], root)
    if (renderer === 'ink') await run('pnpm', ['dev'], root, { CI: '1' })
  }, 120_000)
})
