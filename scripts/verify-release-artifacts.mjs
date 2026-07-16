import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { canonicalHomepage, loadReleaseManifest, releaseRepositoryUrl } from './release-lib.mjs'

const artifactDir = resolve(process.argv[2] ?? 'artifacts')
const expectedVersion = process.argv[3]
if (!expectedVersion) throw new Error('usage: node scripts/verify-release-artifacts.mjs <artifact-dir> <version>')

const root = resolve('.')
const release = await loadReleaseManifest(root)
if (release.version !== expectedVersion) throw new Error(`release manifest is ${release.version}, expected ${expectedVersion}`)

const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

const packageFile = (name, version) => `${name.slice(1).replace('/', '-')}-${version}.tgz`
const collectExportTargets = value => {
  if (typeof value === 'string') return [value]
  if (typeof value !== 'object' || value === null) return []
  return Object.values(value).flatMap(collectExportTargets)
}

const dependencies = {}
const overrides = {}
const checksums = []

for (const item of release.packages) {
  const file = packageFile(item.name, expectedVersion)
  const path = join(artifactDir, file)
  const manifest = JSON.parse(run('tar', ['-xOf', path, 'package/package.json']))
  if (manifest.name !== item.name || manifest.version !== expectedVersion) throw new Error(`${file}: package identity mismatch`)
  if (manifest.license !== 'MIT') throw new Error(`${file}: license metadata is not MIT`)
  if (manifest.repository?.url !== releaseRepositoryUrl) throw new Error(`${file}: repository metadata does not match the public source`)
  if (manifest.homepage !== canonicalHomepage) throw new Error(`${file}: homepage must be ${canonicalHomepage}`)
  if (manifest.publishConfig?.access !== 'public' || manifest.publishConfig?.provenance !== true) throw new Error(`${file}: public provenance policy is missing`)

  const serializedDependencies = JSON.stringify({ ...manifest.dependencies, ...manifest.peerDependencies })
  if (/workspace:|link:/.test(serializedDependencies)) throw new Error(`${file}: packed manifest contains a workspace or link dependency`)

  const entries = new Set(run('tar', ['-tf', path]).trim().split('\n'))
  if (!entries.has('package/README.md')) throw new Error(`${file}: package README is missing`)
  for (const target of collectExportTargets(manifest.exports)) {
    const entry = `package/${target.replace(/^\.\//, '')}`
    if (!entries.has(entry)) throw new Error(`${file}: exported file is missing: ${target}`)
  }

  const fileUrl = `file:${path}`
  dependencies[item.name] = fileUrl
  overrides[item.name] = fileUrl
  checksums.push({
    file,
    value: `${createHash('sha256').update(await readFile(path)).digest('hex')}  ${file}`,
  })
}

const expectedChecksums = `${checksums.sort((left, right) => left.file.localeCompare(right.file)).map(item => item.value).join('\n')}\n`
const actualChecksums = await readFile(join(artifactDir, 'SHA256SUMS'), 'utf8')
if (actualChecksums !== expectedChecksums) throw new Error('SHA256SUMS does not match the release artifacts')

const consumer = await mkdtemp(join(tmpdir(), 'agentskit-chat-v0-'))
try {
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'agentskit-chat-release-consumer',
    private: true,
    type: 'module',
    dependencies,
    pnpm: { overrides },
  }, null, 2))

  run('pnpm', ['install', '--ignore-scripts'], consumer)
  run('node', ['--input-type=module', '-e', [
    "const protocol=await import('@agentskit/chat/protocol')",
    "const chat=await import('@agentskit/chat')",
    "const server=await import('@agentskit/chat/server')",
    "const devtools=await import('@agentskit/chat/devtools')",
    "if(!protocol.decodeTurnEvent||!chat.defineChat||!server.createChatHandler||!devtools.createTraceCapture) throw new Error('missing ESM export')",
  ].join(';')], consumer)
  run('node', ['--input-type=commonjs', '-e', [
    "const protocol=require('@agentskit/chat/protocol')",
    "const chat=require('@agentskit/chat')",
    "const server=require('@agentskit/chat/server')",
    "const devtools=require('@agentskit/chat/devtools')",
    "if(!protocol.decodeTurnEvent||!chat.defineChat||!server.createChatHandler||!devtools.createTraceCapture) throw new Error('missing CJS export')",
  ].join(';')], consumer)
} finally {
  await rm(consumer, { recursive: true, force: true })
}

console.log(`release artifact verification passed for ${expectedVersion}: ${release.packages.length} clean-installable packages`)
