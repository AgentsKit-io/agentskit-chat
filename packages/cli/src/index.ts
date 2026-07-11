import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

export const ChatRendererSchema = z.enum(['react', 'react-native', 'ink'])
export type ChatRenderer = z.infer<typeof ChatRendererSchema>

export interface InitChatProjectOptions {
  readonly targetDir: string
  readonly renderer?: ChatRenderer
  readonly detectFromDir?: string
}

export class ChatCliError extends Error {
  constructor(readonly code: 'RENDERER_REQUIRED' | 'TARGET_EXISTS' | 'MANIFEST_INVALID', message: string) {
    super(message); this.name = 'ChatCliError'
  }
}

const packageJson = (renderer: ChatRenderer): string => JSON.stringify({
  name: 'agentskit-chat-app', private: true, version: '0.0.0', type: 'module', ...(renderer === 'react-native' ? { main: 'expo/AppEntry.js' } : {}),
  scripts: { typecheck: 'tsc --noEmit', test: 'vitest run', ...(renderer === 'react' ? { dev: 'vite', build: 'vite build' } : renderer === 'react-native' ? { dev: 'expo start', build: 'expo export --platform web' } : { dev: 'tsx src/index.tsx' }) },
  dependencies: {
    '@agentskit/chat': 'latest', '@agentskit/chat-protocol': 'latest', '@agentskit/chat-server': 'latest', '@agentskit/core': '^1.12.2',
    ...(renderer === 'react' ? { '@agentskit/chat-react': 'latest', '@agentskit/react': '^0.7.1', react: '^19.0.0', 'react-dom': '^19.0.0' }
      : renderer === 'react-native' ? { '@agentskit/chat-react-native': 'latest', '@agentskit/react-native': '^0.4.4', expo: '^57.0.4', react: '19.2.3', 'react-dom': '19.2.3', 'react-native': '^0.86.0', 'react-native-web': '^0.21.2' }
        : { '@agentskit/chat-ink': 'latest', '@agentskit/ink': '^0.10.1', ink: '^7.0.0', react: '^19.0.0' }),
  },
  devDependencies: { '@types/node': '^25.0.0', '@types/react': '^19.0.0', tsx: '^4.20.0', typescript: '^6.0.0', vitest: '^4.0.0', ...(renderer === 'react' ? { '@types/react-dom': '^19.0.0', '@vitejs/plugin-react': '^5.0.0', vite: '^8.0.0' } : {}) },
}, null, 2) + '\n'

const sharedFiles = (): Record<string, string> => ({
  'src/chat.ts': `import type { AdapterFactory } from '@agentskit/core'
import { defineChat } from '@agentskit/chat'

const demoAdapter: AdapterFactory = {
  createSource: request => ({
    async *stream() {
      const input = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
      yield { type: 'text', content: \`Echo: \${input}\` }
      yield { type: 'done' }
    },
    abort() {},
  }),
}

export const chat = defineChat({ id: 'starter', chat: { adapter: demoAdapter } })
`,
  'src/server.ts': `import type { SessionSnapshot } from '@agentskit/chat-protocol'
import type { SessionStorage } from '@agentskit/chat'
import { createChatHandler } from '@agentskit/chat-server'
import { chat } from './chat.js'

let snapshot: SessionSnapshot | undefined
const storage: SessionStorage = {
  load: () => snapshot,
  save: (next, expected) => {
    if (snapshot?.cursor !== expected) return false
    snapshot = structuredClone(next)
    return true
  },
}

export const handleChat = createChatHandler({ resolveDefinition: () => chat, sessionStorage: () => storage })
`,
  'tests/chat.test.ts': `import { describe, expect, it } from 'vitest'
import { chat } from '../src/chat.js'
import { handleChat } from '../src/server.js'

describe('generated chat', () => {
  it('exports one runnable shared definition', () => expect(chat.id).toBe('starter'))
  it('serves one complete turn through the Web handler', async () => {
    const event = { protocol: 'agentskit.chat.turn', version: 1, eventId: 'submit', sessionId: 'session', turnId: 'turn', sequence: 0, emittedAt: new Date(0).toISOString(), event: 'client.turn.submit', payload: { input: 'hello' } }
    const response = await handleChat(new Request('http://localhost/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) }))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Echo: hello')
  })
})
`,
  'README.md': `# AgentsKit Chat starter

The shared definition lives in \`src/chat.ts\`, the Web-standard server seam in \`src/server.ts\`, and the native renderer entry under \`src\`.

Run \`pnpm typecheck && pnpm test\`, then \`pnpm dev\`. Replace the demo adapter in the shared definition with any published AgentsKit adapter.
`,
  '.gitignore': 'node_modules\ndist\n.expo\n.env\n',
})

const rendererFiles = (renderer: ChatRenderer): Record<string, string> => renderer === 'react' ? {
  'index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  'src/main.tsx': `import '@agentskit/react/theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AgentChat } from '@agentskit/chat-react'
import { chat } from './chat.js'

createRoot(document.getElementById('root')!).render(<StrictMode><AgentChat definition={chat} /></StrictMode>)
`,
  'src/vite-env.d.ts': `/// <reference types="vite/client" />
declare module '@agentskit/react/theme'
`,
  'vite.config.ts': `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({ plugins: [react()] })
`,
} : renderer === 'react-native' ? {
  'App.tsx': `import { AgentChatNative } from '@agentskit/chat-react-native'
import { chat } from './src/chat'
export default function App() { return <AgentChatNative definition={chat} /> }
`,
  'app.json': JSON.stringify({ expo: { name: 'AgentsKit Chat', slug: 'agentskit-chat' } }, null, 2) + '\n',
} : {
  'src/index.tsx': `import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'
import { chat } from './chat.js'
const app = render(<AgentChat definition={chat} />)
if (process.env.CI) setTimeout(() => app.unmount(), 0)
`,
}

const tsconfig = (renderer: ChatRenderer): string => JSON.stringify({ compilerOptions: {
  target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true,
  ...(renderer === 'react' ? { lib: ['ES2022', 'DOM'] } : {}),
  ...(renderer === 'ink' ? { types: ['node'] } : {}),
}, include: renderer === 'react-native' ? ['App.tsx', 'src', 'tests'] : ['src', 'tests'] }, null, 2) + '\n'

export const detectRenderer = async (targetDir: string): Promise<ChatRenderer | undefined> => {
  try {
    const input = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8')) as unknown
    const manifest = z.object({ dependencies: z.record(z.string(), z.string()).optional(), devDependencies: z.record(z.string(), z.string()).optional() }).passthrough().parse(input)
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
    if (dependencies.expo || dependencies['react-native']) return 'react-native'
    if (dependencies.ink) return 'ink'
    return dependencies.react ? 'react' : undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new ChatCliError('MANIFEST_INVALID', 'Could not read a valid package.json for renderer detection.')
  }
}

export const initChatProject = async (options: InitChatProjectOptions): Promise<readonly string[]> => {
  const targetDir = path.resolve(options.targetDir)
  const candidate = options.renderer ?? await detectRenderer(options.detectFromDir ?? targetDir)
  if (!candidate) throw new ChatCliError('RENDERER_REQUIRED', 'Choose a renderer with --renderer react, react-native, or ink.')
  const renderer = ChatRendererSchema.parse(candidate)
  const files = { ...sharedFiles(), ...rendererFiles(renderer), 'package.json': packageJson(renderer), 'tsconfig.json': tsconfig(renderer) }
  const parent = path.dirname(targetDir)
  await mkdir(parent, { recursive: true })
  const staging = await mkdtemp(path.join(parent, `.${path.basename(targetDir)}-`))
  try {
    const writes = await Promise.allSettled(Object.entries(files).map(async ([relative, content]) => {
      const destination = path.join(staging, relative)
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' })
    }))
    const failure = writes.find(result => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    await rename(staging, targetDir)
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'EEXIST' || code === 'ENOTEMPTY' || code === 'EISDIR' || code === 'ENOTDIR') throw new ChatCliError('TARGET_EXISTS', `Refusing to overwrite existing path: ${targetDir}`)
    throw error
  }
  return Object.keys(files).sort()
}
