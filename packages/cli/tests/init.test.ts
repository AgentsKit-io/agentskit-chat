import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CHAT_RENDERERS, ChatCliError, addChatComponent, detectRenderer, initChatProject, type ChatRenderer } from '../src/index.js'

const roots: string[] = []
const temporary = async (): Promise<string> => { const root = await mkdtemp(path.join(tmpdir(), 'agentskit-chat-')); roots.push(root); return root }
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))))

describe('chat init', () => {
  it.each(CHAT_RENDERERS)('generates the complete %s slice deterministically', async renderer => {
    const root = await temporary()
    const target = path.join(root, 'project')
    const files = await initChatProject({ targetDir: target, renderer })
    expect(files).toEqual(expect.arrayContaining(['README.md', 'package.json', 'src/chat.ts', 'src/server.ts', 'tests/chat.test.ts', 'tsconfig.json']))
    expect(JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8')).dependencies).toHaveProperty(`@agentskit/chat-${renderer}`)
    await expect(initChatProject({ targetDir: target, renderer })).rejects.toMatchObject({ code: 'TARGET_EXISTS' })
  })

  it.each([
    [{ react: '^19' }, 'react'],
    [{ react: '^19', expo: '^54', 'react-native': '^0.86' }, 'react-native'],
    [{ react: '^19', ink: '^7' }, 'ink'],
    [{ vue: '^3' }, 'vue'],
    [{ svelte: '^5' }, 'svelte'],
    [{ 'solid-js': '^1' }, 'solid'],
    [{ '@angular/core': '^21' }, 'angular'],
  ] as const)('detects native renderer dependencies', async (dependencies, expected) => {
    const root = await temporary()
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies }))
    expect(await detectRenderer(root)).toBe(expected satisfies ChatRenderer)
  })

  it('adds one shared semantic component and selected native files without overwrite', async () => {
    const root = await temporary()
    const files = await addChatComponent({ projectDir: root, name: 'Status Card', renderers: ['react', 'vue', 'ink'] })
    expect(files).toEqual(['src/components/ink/status-card.tsx', 'src/components/react/status-card.tsx', 'src/components/status-card.ts', 'src/components/vue/status-card.ts'])
    expect(await readFile(path.join(root, 'src/components/status-card.ts'), 'utf8')).toContain("key: 'status-card'")
    await expect(addChatComponent({ projectDir: root, name: 'status-card', renderers: ['react'] })).rejects.toMatchObject({ code: 'COMPONENT_EXISTS' })
    await expect(addChatComponent({ projectDir: root, name: '---', renderers: ['react'] })).rejects.toMatchObject({ code: 'COMPONENT_INVALID' })
    await expect(addChatComponent({ projectDir: root, name: 'form', renderers: ['react'] })).rejects.toMatchObject({ code: 'COMPONENT_INVALID' })
  })

  it('generates native conventions for every renderer and preflights collisions', async () => {
    const root = await temporary()
    const files = await addChatComponent({ projectDir: root, name: 'Metric Tile', renderers: CHAT_RENDERERS })
    expect(files).toHaveLength(8)
    expect(files).toEqual(expect.arrayContaining(['src/components/angular/metric-tile.ts', 'src/components/svelte/metric-tile.svelte', 'src/components/react-native/metric-tile.tsx']))
    const collisionRoot = await temporary()
    await mkdir(path.join(collisionRoot, 'src/components'), { recursive: true })
    await writeFile(path.join(collisionRoot, 'src/components/metric-tile.ts'), 'owned')
    await expect(addChatComponent({ projectDir: collisionRoot, name: 'metric-tile', renderers: ['vue'] })).rejects.toMatchObject({ code: 'COMPONENT_EXISTS' })
    await expect(readFile(path.join(collisionRoot, 'src/components/vue/metric-tile.ts'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('requires an explicit renderer when detection cannot decide', async () => {
    const root = await temporary()
    await expect(initChatProject({ targetDir: root })).rejects.toBeInstanceOf(ChatCliError)
    await expect(initChatProject({ targetDir: path.join(root, 'invalid'), renderer: 'unknown' as ChatRenderer })).rejects.toThrow()
  })

  it('detects from a host project while writing only to an empty child target', async () => {
    const host = await temporary()
    await writeFile(path.join(host, 'package.json'), JSON.stringify({ dependencies: { react: '^19' } }))
    const files = await initChatProject({ targetDir: path.join(host, 'generated'), detectFromDir: host })
    expect(files).toContain('src/main.tsx')
  })

  it('refuses an existing file target without leaving staging files', async () => {
    const root = await temporary()
    const target = path.join(root, 'project')
    await writeFile(target, 'owned')
    await expect(initChatProject({ targetDir: target, renderer: 'react' })).rejects.toMatchObject({ code: 'TARGET_EXISTS' })
    expect(await readFile(target, 'utf8')).toBe('owned')
  })
})
