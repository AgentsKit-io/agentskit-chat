import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ChatCliError, detectRenderer, initChatProject, type ChatRenderer } from '../src/index.js'

const roots: string[] = []
const temporary = async (): Promise<string> => { const root = await mkdtemp(path.join(tmpdir(), 'agentskit-chat-')); roots.push(root); return root }
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))))

describe('chat init', () => {
  it.each(['react', 'react-native', 'ink'] as const)('generates the complete %s slice deterministically', async renderer => {
    const root = await temporary()
    const target = path.join(root, 'project')
    const files = await initChatProject({ targetDir: target, renderer })
    expect(files).toEqual(expect.arrayContaining(['README.md', 'package.json', 'src/chat.ts', 'src/server.ts', 'tests/chat.test.ts', 'tsconfig.json']))
    expect(JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8')).dependencies).toHaveProperty(`@agentskit/chat-${renderer === 'react-native' ? 'react-native' : renderer}`)
    await expect(initChatProject({ targetDir: target, renderer })).rejects.toMatchObject({ code: 'TARGET_EXISTS' })
  })

  it.each([
    [{ react: '^19' }, 'react'],
    [{ react: '^19', expo: '^54', 'react-native': '^0.86' }, 'react-native'],
    [{ react: '^19', ink: '^7' }, 'ink'],
  ] as const)('detects native renderer dependencies', async (dependencies, expected) => {
    const root = await temporary()
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies }))
    expect(await detectRenderer(root)).toBe(expected satisfies ChatRenderer)
  })

  it('requires an explicit renderer when detection cannot decide', async () => {
    const root = await temporary()
    await expect(initChatProject({ targetDir: root })).rejects.toBeInstanceOf(ChatCliError)
    await expect(initChatProject({ targetDir: path.join(root, 'invalid'), renderer: 'vue' as ChatRenderer })).rejects.toThrow()
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
