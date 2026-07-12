import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { stdin, stderr, stdout } from 'node:process'
import { CHAT_RENDERERS, ChatRendererSchema, addChatComponent, detectRenderer, initChatProject } from './index.js'

declare const __CLI_VERSION__: string

const help = `Usage: agentskit-chat init [directory] [--renderer ${CHAT_RENDERERS.join('|')}] [--yes]
       agentskit-chat add component <name> --renderer react,vue [--directory .] [--yes]
       agentskit-chat completion bash|zsh|fish
       agentskit-chat --help
       agentskit-chat --version
`

const completion = (shell: string | undefined): string => {
  if (shell === 'bash') return 'complete -W "init add component completion --help --version" agentskit-chat\n'
  if (shell === 'zsh') return `#compdef agentskit-chat\n_arguments "1:command:(init add completion)" "--renderer[renderer]:renderer:(${CHAT_RENDERERS.join(' ')})"\n`
  if (shell === 'fish') return `complete -c agentskit-chat -f -a "init add completion"\ncomplete -c agentskit-chat -l renderer -a "${CHAT_RENDERERS.join(' ')}"\n`
  throw new Error(`Expected completion shell bash, zsh, or fish.\n${help}`)
}

const main = async (): Promise<void> => {
  const parsed = parseArgs({ allowPositionals: true, strict: true, options: { renderer: { type: 'string' }, directory: { type: 'string', short: 'd' }, yes: { type: 'boolean', short: 'y' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } } })
  if (parsed.values.help) return void stdout.write(help)
  if (parsed.values.version) return void stdout.write(`${__CLI_VERSION__}\n`)
  if (parsed.positionals[0] === 'completion') {
    if (parsed.positionals.length !== 2) throw new Error(`Expected one completion shell.\n${help}`)
    return void stdout.write(completion(parsed.positionals[1]))
  }
  if (parsed.positionals[0] === 'add') {
    if (parsed.positionals[1] !== 'component' || parsed.positionals.length !== 3) throw new Error(`Expected add component <name>.\n${help}`)
    const renderers = parsed.values.renderer?.split(',').filter(Boolean).map(renderer => ChatRendererSchema.parse(renderer))
    if (!renderers?.length) throw new Error(`Expected --renderer with one or more comma-separated targets.\n${help}`)
    const files = await addChatComponent({ projectDir: parsed.values.directory ?? process.cwd(), name: parsed.positionals[2]!, renderers })
    return void stdout.write(`${JSON.stringify({ ok: true, files })}\n`)
  }
  if (parsed.positionals[0] !== 'init') throw new Error(`Expected init command.\n${help}`)
  if (parsed.positionals.length > 2) throw new Error(`Expected at most one target directory.\n${help}`)
  let renderer = parsed.values.renderer ?? await detectRenderer(process.cwd())
  if (!renderer && !parsed.values.yes && stdin.isTTY && stdout.isTTY) {
    const prompt = createInterface({ input: stdin, output: stdout })
    try { renderer = await prompt.question(`Renderer (${CHAT_RENDERERS.join(', ')}): `) } finally { prompt.close() }
  }
  const files = await initChatProject({ targetDir: parsed.positionals[1] ?? 'agentskit-chat-app', detectFromDir: process.cwd(), ...(renderer ? { renderer: ChatRendererSchema.parse(renderer) } : {}) })
  stdout.write(`${JSON.stringify({ ok: true, files })}\n`)
}

main().catch(error => { stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
