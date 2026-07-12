import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { STANDARD_COMPONENT_KEYS } from '@agentskit/chat'
import { z } from 'zod'

export const CHAT_RENDERERS = ['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular'] as const
export const ChatRendererSchema = z.enum(CHAT_RENDERERS)
export type ChatRenderer = z.infer<typeof ChatRendererSchema>

export interface InitChatProjectOptions {
  readonly targetDir: string
  readonly renderer?: ChatRenderer
  readonly detectFromDir?: string
}

export interface AddComponentOptions {
  readonly projectDir: string
  readonly name: string
  readonly renderers: readonly ChatRenderer[]
}

export class ChatCliError extends Error {
  constructor(readonly code: 'RENDERER_REQUIRED' | 'TARGET_EXISTS' | 'MANIFEST_INVALID' | 'COMPONENT_INVALID' | 'COMPONENT_EXISTS', message: string) {
    super(message); this.name = 'ChatCliError'
  }
}

const packageJson = (renderer: ChatRenderer): string => JSON.stringify({
  name: 'agentskit-chat-app', private: true, version: '0.0.0', type: 'module', ...(renderer === 'react-native' ? { main: 'expo/AppEntry.js' } : {}),
  scripts: { typecheck: renderer === 'svelte' ? 'svelte-check --tsconfig ./tsconfig.json' : 'tsc --noEmit', test: 'vitest run', ...(['react', 'vue', 'svelte', 'solid', 'angular'].includes(renderer) ? { dev: 'vite', build: 'vite build' } : renderer === 'react-native' ? { dev: 'expo start', build: 'expo export --platform web' } : { dev: 'tsx src/index.tsx' }) },
  dependencies: {
    '@agentskit/chat': 'latest', '@agentskit/chat-protocol': 'latest', '@agentskit/chat-server': 'latest', '@agentskit/core': '^1.12.2', zod: '^4.3.6',
    ...(renderer === 'react' ? { '@agentskit/chat-react': 'latest', '@agentskit/react': '^0.7.1', react: '^19.0.0', 'react-dom': '^19.0.0' }
      : renderer === 'react-native' ? { '@agentskit/chat-react-native': 'latest', '@agentskit/react-native': '^0.4.4', expo: '^57.0.4', react: '19.2.3', 'react-dom': '19.2.3', 'react-native': '^0.86.0', 'react-native-web': '^0.21.2' }
        : renderer === 'ink' ? { '@agentskit/chat-ink': 'latest', '@agentskit/ink': '^0.10.1', ink: '^7.0.0', react: '^19.0.0' }
          : renderer === 'vue' ? { '@agentskit/chat-vue': 'latest', '@agentskit/vue': '^0.4.4', vue: '^3.5.0' }
            : renderer === 'svelte' ? { '@agentskit/chat-svelte': 'latest', '@agentskit/svelte': '^0.4.4', svelte: '^5.0.0' }
              : renderer === 'solid' ? { '@agentskit/chat-solid': 'latest', '@agentskit/solid': '^0.4.4', 'solid-js': '^1.9.0' }
                : { '@agentskit/chat-angular': 'latest', '@agentskit/angular': '^0.4.6', '@angular/common': '^21.0.0', '@angular/compiler': '^21.0.0', '@angular/core': '^21.0.0', '@angular/platform-browser': '^21.0.0', rxjs: '^7.8.0', tslib: '^2.8.0', 'zone.js': '^0.16.0' }),
  },
  devDependencies: { '@types/node': '^25.0.0', tsx: '^4.20.0', typescript: renderer === 'angular' ? '^5.9.0' : '^6.0.0', vitest: '^4.0.0', ...(['react', 'react-native', 'ink'].includes(renderer) ? { '@types/react': '^19.0.0' } : {}), ...(renderer === 'react' ? { '@types/react-dom': '^19.0.0', '@vitejs/plugin-react': '^5.0.0', vite: '^8.0.0' } : renderer === 'vue' ? { '@vitejs/plugin-vue': '^6.0.0', vite: '^8.0.0' } : renderer === 'svelte' ? { '@sveltejs/vite-plugin-svelte': '^7.0.0', 'svelte-check': '^4.0.0', vite: '^8.0.0' } : renderer === 'solid' ? { 'vite-plugin-solid': '^2.11.0', vite: '^8.0.0' } : renderer === 'angular' ? { vite: '^8.0.0' } : {}) },
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
  'vitest.config.ts': `import { defineConfig } from 'vitest/config'\nexport default defineConfig({ test: { environment: 'node' } })\n`,
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
} : renderer === 'ink' ? {
  'src/index.tsx': `import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'
import { chat } from './chat.js'
const app = render(<AgentChat definition={chat} />)
if (process.env.CI) setTimeout(() => app.unmount(), 0)
`,
} : renderer === 'vue' ? {
  'index.html': '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  'src/main.ts': `import { createApp, h } from 'vue'\nimport { AgentChat } from '@agentskit/chat-vue'\nimport { chat } from './chat.js'\ncreateApp({ render: () => h(AgentChat, { definition: chat }) }).mount('#app')\n`,
  'vite.config.ts': `import vue from '@vitejs/plugin-vue'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [vue()] })\n`,
} : renderer === 'svelte' ? {
  'index.html': '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  'src/App.svelte': `<script lang="ts">\n  import { AgentChat } from '@agentskit/chat-svelte'\n  import { chat } from './chat.js'\n</script>\n<AgentChat definition={chat} />\n`,
  'src/main.ts': `import { mount } from 'svelte'\nimport App from './App.svelte'\nmount(App, { target: document.getElementById('app')! })\n`,
  'src/vite-env.d.ts': `/// <reference types="svelte" />\n`,
  'vite.config.ts': `import { svelte } from '@sveltejs/vite-plugin-svelte'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [svelte()] })\n`,
} : renderer === 'solid' ? {
  'index.html': '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  'src/main.tsx': `import { render } from 'solid-js/web'\nimport { AgentChat } from '@agentskit/chat-solid'\nimport { chat } from './chat.js'\nrender(() => <AgentChat definition={chat} />, document.getElementById('app')!)\n`,
  'vite.config.ts': `import { defineConfig } from 'vite'\nimport solid from 'vite-plugin-solid'\nexport default defineConfig({ plugins: [solid()] })\n`,
} : {
  'index.html': '<!doctype html><html><body><app-root></app-root><script type="module" src="/src/main.ts"></script></body></html>\n',
  'src/main.ts': `import 'zone.js'\nimport '@angular/compiler'\nimport { Component } from '@angular/core'\nimport { bootstrapApplication } from '@angular/platform-browser'\nimport { AgentChatComponent } from '@agentskit/chat-angular'\nimport { chat } from './chat.js'\n@Component({ selector: 'app-root', standalone: true, imports: [AgentChatComponent], template: '<ak-agent-chat [definition]="chat" />' })\nclass AppComponent { readonly chat = chat }\nvoid bootstrapApplication(AppComponent)\n`,
}

const tsconfig = (renderer: ChatRenderer): string => JSON.stringify({ compilerOptions: {
  target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true,
  ...(renderer === 'solid' ? { jsx: 'preserve', jsxImportSource: 'solid-js' } : {}),
  ...(['react', 'vue', 'svelte', 'solid', 'angular'].includes(renderer) ? { lib: ['ES2022', 'DOM'] } : {}),
  ...(renderer === 'ink' ? { types: ['node'] } : {}),
}, include: renderer === 'react-native' ? ['App.tsx', 'src', 'tests'] : ['src', 'tests'] }, null, 2) + '\n'

export const detectRenderer = async (targetDir: string): Promise<ChatRenderer | undefined> => {
  try {
    const input = JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8')) as unknown
    const manifest = z.object({ dependencies: z.record(z.string(), z.string()).optional(), devDependencies: z.record(z.string(), z.string()).optional() }).passthrough().parse(input)
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
    if (dependencies.expo || dependencies['react-native']) return 'react-native'
    if (dependencies.ink) return 'ink'
    if (dependencies['@angular/core']) return 'angular'
    if (dependencies.svelte) return 'svelte'
    if (dependencies.vue) return 'vue'
    if (dependencies['solid-js']) return 'solid'
    return dependencies.react ? 'react' : undefined
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new ChatCliError('MANIFEST_INVALID', 'Could not read a valid package.json for renderer detection.')
  }
}

export const initChatProject = async (options: InitChatProjectOptions): Promise<readonly string[]> => {
  const targetDir = path.resolve(options.targetDir)
  const candidate = options.renderer ?? await detectRenderer(options.detectFromDir ?? targetDir)
  if (!candidate) throw new ChatCliError('RENDERER_REQUIRED', `Choose a renderer with --renderer ${CHAT_RENDERERS.join(', ')}.`)
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

const componentName = (input: string): { readonly kebab: string; readonly pascal: string } => {
  const kebab = input.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(kebab)) throw new ChatCliError('COMPONENT_INVALID', 'Component name must start with a letter and contain only letters, numbers, or dashes.')
  if (STANDARD_COMPONENT_KEYS.includes(kebab as typeof STANDARD_COMPONENT_KEYS[number])) throw new ChatCliError('COMPONENT_INVALID', 'Component name is reserved by the standard catalog.')
  return { kebab, pascal: kebab.split('-').map(part => part[0]!.toUpperCase() + part.slice(1)).join('') }
}

const componentFiles = (name: string, renderers: readonly ChatRenderer[]): Record<string, string> => {
  const { kebab, pascal } = componentName(name)
  const shared = `import { z } from 'zod'\nimport type { ComponentDefinition } from '@agentskit/chat'\n\nexport const ${pascal}PropsSchema = z.object({ label: z.string().min(1).max(256) }).strict().readonly()\nexport type ${pascal}Props = z.infer<typeof ${pascal}PropsSchema>\nexport const ${pascal}Component = { key: '${kebab}', propsSchema: ${pascal}PropsSchema, events: [], accessibility: { role: 'group', keyboard: false, live: 'none' }, capabilities: ['display'], fallback: props => props.label } satisfies ComponentDefinition<${pascal}Props>\n`
  const files: Record<string, string> = { [`src/components/${kebab}.ts`]: shared }
  for (const renderer of [...new Set(renderers)]) {
    const relative = `src/components/${renderer}/${kebab}.${renderer === 'svelte' ? 'svelte' : renderer === 'vue' || renderer === 'angular' ? 'ts' : 'tsx'}`
    files[relative] = renderer === 'svelte'
      ? `<script lang="ts">\n  import { StandardComponent } from '@agentskit/chat-svelte'\n  import type { ComponentManifest } from '@agentskit/chat'\n  import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'\n  import { ${pascal}PropsSchema } from '../${kebab}.js'\n  let { frame, manifest, onInteract, disabled = false }: { frame: ComponentRenderFrame; manifest: ComponentManifest; onInteract: (event: ComponentInteractionEvent) => void; disabled?: boolean } = $props()\n  const value = $derived(frame.componentKey === '${kebab}' ? ${pascal}PropsSchema.parse(frame.props) : undefined)\n</script>\n{#if value}<section aria-label={value.label}>{value.label}</section>{:else}<StandardComponent {frame} {manifest} {onInteract} {disabled} />{/if}\n`
      : renderer === 'vue'
        ? `import { h, type VNode } from 'vue'\nimport { StandardComponent, type StandardComponentProps } from '@agentskit/chat-vue'\nimport { ${pascal}PropsSchema } from '../${kebab}.js'\nexport const ${pascal} = (slot: StandardComponentProps): VNode[] => { if (slot.frame.componentKey !== '${kebab}') return [h(StandardComponent, slot)]; const props = ${pascal}PropsSchema.parse(slot.frame.props); return [h('section', { 'aria-label': props.label }, props.label)] }\n`
        : renderer === 'angular'
          ? `import { Component, Input } from '@angular/core'\nimport { StandardComponentComponent } from '@agentskit/chat-angular'\nimport type { ComponentManifest } from '@agentskit/chat'\nimport type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'\nimport { ${pascal}PropsSchema } from '../${kebab}.js'\n@Component({ selector: 'ak-${kebab}', standalone: true, imports: [StandardComponentComponent], template: '@if (value; as item) { <section [attr.aria-label]="item.label">{{ item.label }}</section> } @else { <ak-standard-component [frame]="frame" [manifest]="manifest" [onInteract]="onInteract" [disabled]="disabled" /> }' })\nexport class ${pascal}Component { @Input({ required: true }) frame!: ComponentRenderFrame; @Input({ required: true }) manifest!: ComponentManifest; @Input({ required: true }) onInteract!: (event: ComponentInteractionEvent) => void; @Input() disabled = false; get value() { return this.frame.componentKey === '${kebab}' ? ${pascal}PropsSchema.parse(this.frame.props) : undefined } }\n`
          : renderer === 'solid'
            ? `import { StandardComponent, type StandardComponentProps } from '@agentskit/chat-solid'\nimport { ${pascal}PropsSchema } from '../${kebab}.js'\nexport const ${pascal} = (slot: StandardComponentProps) => { if (slot.frame.componentKey !== '${kebab}') return <StandardComponent {...slot} />; const props = ${pascal}PropsSchema.parse(slot.frame.props); return <section aria-label={props.label}>{props.label}</section> }\n`
            : `import { ${renderer === 'react-native' ? 'StandardComponentNative as DefaultStandardComponent, type StandardComponentNativeProps' : 'StandardComponent as DefaultStandardComponent, type StandardComponentProps'} } from '@agentskit/chat-${renderer}'\nimport { ${pascal}PropsSchema } from '../${kebab}.js'\n${renderer === 'react-native' ? "import { Text } from 'react-native'\n" : renderer === 'ink' ? "import { Text } from 'ink'\n" : ''}export const ${pascal} = (slot: ${renderer === 'react-native' ? 'StandardComponentNativeProps' : 'StandardComponentProps'}) => { if (slot.frame.componentKey !== '${kebab}') return <DefaultStandardComponent {...slot} />; const props = ${pascal}PropsSchema.parse(slot.frame.props); return <${renderer === 'react-native' || renderer === 'ink' ? 'Text' : 'section'}${renderer === 'react-native' ? ' accessibilityLabel={props.label}' : renderer === 'ink' ? '' : ' aria-label={props.label}'}>{props.label}</${renderer === 'react-native' || renderer === 'ink' ? 'Text' : 'section'}> }\n`
  }
  return files
}

export const addChatComponent = async (options: AddComponentOptions): Promise<readonly string[]> => {
  const projectDir = await realpath(path.resolve(options.projectDir)).catch(() => { throw new ChatCliError('MANIFEST_INVALID', 'Component generation requires an existing project directory.') })
  const renderers = z.array(ChatRendererSchema).min(1).parse(options.renderers)
  const files = componentFiles(options.name, renderers)
  const destinations = Object.keys(files).map(relative => path.join(projectDir, relative))
  for (const destination of destinations) {
    let current = path.dirname(destination)
    while (current !== projectDir) {
      const status = await lstat(current).catch(error => (error as NodeJS.ErrnoException).code === 'ENOENT' ? undefined : Promise.reject(error))
      if (status?.isSymbolicLink()) throw new ChatCliError('MANIFEST_INVALID', 'Refusing to write through a symbolic-link component directory.')
      current = path.dirname(current)
    }
  }
  const checks = await Promise.all(destinations.map(destination => readFile(destination).then(() => true, error => (error as NodeJS.ErrnoException).code === 'ENOENT' ? false : Promise.reject(error))))
  if (checks.some(Boolean)) throw new ChatCliError('COMPONENT_EXISTS', 'Refusing to overwrite an existing component file.')
  const created: string[] = []
  try {
    for (const [relative, content] of Object.entries(files)) { const destination = path.join(projectDir, relative); await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' }); created.push(destination) }
  } catch (error) {
    await Promise.all(created.map(destination => rm(destination, { force: true })))
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ChatCliError('COMPONENT_EXISTS', 'Refusing to overwrite an existing component file.')
    throw error
  }
  return Object.keys(files).sort()
}
