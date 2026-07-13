import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const artifactDir = resolve(process.argv[2] ?? 'artifacts')
const version = process.argv[3]
if (!version) throw new Error('usage: node scripts/verify-alpha-artifacts.mjs <artifact-dir> <version>')

const packages = [
  ['@agentskit/chat-protocol', `agentskit-chat-protocol-${version}.tgz`],
  ['@agentskit/chat', `agentskit-chat-${version}.tgz`],
  ['@agentskit/chat-react', `agentskit-chat-react-${version}.tgz`],
  ['@agentskit/chat-server', `agentskit-chat-server-${version}.tgz`],
]

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

const dependencies = {}
const checksums = []
for (const [name, file] of packages) {
  const path = join(artifactDir, file)
  const manifest = JSON.parse(run('tar', ['-xOf', path, 'package/package.json']))
  if (manifest.name !== name || manifest.version !== version) throw new Error(`${file} identity mismatch`)
  const serialized = JSON.stringify({ ...manifest.dependencies, ...manifest.peerDependencies })
  if (/workspace:|link:/.test(serialized)) throw new Error(`${file} contains a private workspace dependency`)
  dependencies[name] = `file:${path}`
  checksums.push({ file: basename(path), value: `${createHash('sha256').update(await readFile(path)).digest('hex')}  ${basename(path)}` })
}

const expectedChecksums = `${checksums.sort((left, right) => left.file.localeCompare(right.file)).map(item => item.value).join('\n')}\n`
if (await readFile(join(artifactDir, 'SHA256SUMS'), 'utf8') !== expectedChecksums) throw new Error('SHA256SUMS does not match the packed artifacts')

const consumer = await mkdtemp(join(tmpdir(), 'agentskit-chat-alpha-'))
await writeFile(join(consumer, 'package.json'), JSON.stringify({
  name: 'agentskit-chat-alpha-consumer', private: true, type: 'module',
  dependencies: { ...dependencies, '@agentskit/core': '^1.12.2', '@agentskit/react': '^0.7.1', react: '^19.2.7', 'react-dom': '^19.2.7', zod: '^4.3.6' },
  devDependencies: { '@vitejs/plugin-react': '^6.0.3', vite: '^8.1.4' },
  pnpm: { overrides: { '@agentskit/chat-protocol': dependencies['@agentskit/chat-protocol'], '@agentskit/chat': dependencies['@agentskit/chat'] } },
}, null, 2))
await writeFile(join(consumer, 'index.html'), '<div id="root"></div><script type="module" src="/src.jsx"></script>')
await writeFile(join(consumer, 'src.jsx'), "import React from 'react'; import { createRoot } from 'react-dom/client'; import { AgentChat } from '@agentskit/chat-react'; import { defineChat } from '@agentskit/chat'; const definition=defineChat({id:'clean-room',chat:{adapter:{createSource:()=>({async *stream(){yield {type:'done'}},abort(){}})}}}); createRoot(document.getElementById('root')).render(React.createElement(AgentChat,{definition}));")
run('pnpm', ['install', '--ignore-scripts'], consumer)
run('node', ['--input-type=module', '-e', "const [p,c,r,s]=await Promise.all([import('@agentskit/chat-protocol'),import('@agentskit/chat'),import('@agentskit/chat-react'),import('@agentskit/chat-server')]); if(!p.decodeTurnEvent||!c.defineChat||!c.createAskAdapter||!c.createAskSessionMemory||!r.AgentChat||!s.createChatHandler) throw new Error('missing ESM export')"], consumer)
run('node', ['--input-type=commonjs', '-e', "const p=require('@agentskit/chat-protocol'),c=require('@agentskit/chat'),r=require('@agentskit/chat-react'),s=require('@agentskit/chat-server'); if(!p.decodeTurnEvent||!c.defineChat||!c.createAskAdapter||!c.createAskSessionMemory||!r.AgentChat||!s.createChatHandler) throw new Error('missing CJS export')"], consumer)
run('pnpm', ['exec', 'vite', 'build'], consumer)
console.log(`alpha artifact verification passed for ${version}`)
