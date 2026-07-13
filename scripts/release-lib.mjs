import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const repositoryUrl = 'git+https://github.com/AgentsKit-io/agentskit-chat.git'

const releaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  packages: z.array(z.object({
    name: z.string().startsWith('@agentskit/chat'),
    directory: z.string().regex(/^[a-z-]+$/),
  }).strict()).min(1),
  renderers: z.array(z.object({
    id: z.enum(['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular']),
    package: z.string(),
    platform: z.enum(['dom', 'native-mobile', 'terminal']),
  }).strict()).length(7),
}).strict()

const packageManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().min(1),
  license: z.literal('MIT'),
  repository: z.object({
    type: z.literal('git'),
    url: z.literal(repositoryUrl),
    directory: z.string(),
  }).strict(),
  homepage: z.literal('https://github.com/AgentsKit-io/agentskit-chat#readme'),
  bugs: z.object({
    url: z.literal('https://github.com/AgentsKit-io/agentskit-chat/issues'),
  }).strict(),
  files: z.array(z.string()).min(1),
  exports: z.record(z.string(), z.unknown()),
  dependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  publishConfig: z.object({
    access: z.literal('public'),
    provenance: z.literal(true),
  }).strict(),
}).passthrough()

const requiredDocs = [
  'CHANGELOG.md',
  'SECURITY.md',
  'docs/api-reference.md',
  'docs/deployment.md',
  'docs/getting-started/README.md',
  'docs/releases/compatibility.md',
  'docs/releases/migration-from-alpha.md',
  'docs/releases/release-process.md',
  'docs/releases/stability.md',
  'docs/releases/v0.1.0.md',
  'docs/releases/v0.2.0.md',
  'docs/server.md',
]

const rendererDocs = ['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular']

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))

const collectExportTargets = value => {
  if (typeof value === 'string') return [value]
  if (typeof value !== 'object' || value === null) return []
  return Object.values(value).flatMap(collectExportTargets)
}

export const loadReleaseManifest = async root => releaseManifestSchema.parse(
  await readJson(join(root, 'release/manifest.json')),
)

export const inspectRelease = async root => {
  const release = await loadReleaseManifest(root)
  const diagnostics = []
  const workspaceManifest = await readJson(join(root, 'package.json'))
  if (workspaceManifest.version !== release.version) diagnostics.push(`workspace version ${workspaceManifest.version} does not match ${release.version}`)
  const names = new Set()
  const directories = new Set()

  for (const item of release.packages) {
    if (names.has(item.name)) diagnostics.push(`duplicate package name: ${item.name}`)
    if (directories.has(item.directory)) diagnostics.push(`duplicate package directory: ${item.directory}`)
    names.add(item.name)
    directories.add(item.directory)

    const packageRoot = join(root, 'packages', item.directory)
    const result = packageManifestSchema.safeParse(await readJson(join(packageRoot, 'package.json')))
    if (!result.success) {
      diagnostics.push(`${item.name}: invalid package manifest: ${z.prettifyError(result.error)}`)
      continue
    }

    const manifest = result.data
    if (manifest.name !== item.name) diagnostics.push(`${item.name}: manifest name is ${manifest.name}`)
    if (manifest.version !== release.version) diagnostics.push(`${item.name}: version ${manifest.version} does not match ${release.version}`)
    if (manifest.repository.directory !== `packages/${item.directory}`) diagnostics.push(`${item.name}: repository.directory is incorrect`)
    if (!manifest.files.includes('dist')) diagnostics.push(`${item.name}: files must include dist`)

    for (const [dependency, range] of Object.entries(manifest.dependencies ?? {})) {
      if (names.has(dependency) || release.packages.some(candidate => candidate.name === dependency)) {
        if (range !== 'workspace:*') diagnostics.push(`${item.name}: internal dependency ${dependency} must use workspace:*`)
      }
    }

    for (const target of collectExportTargets(manifest.exports)) {
      if (!target.startsWith('./dist/')) {
        diagnostics.push(`${item.name}: export target ${target} must be inside dist`)
        continue
      }
      try {
        await access(join(packageRoot, target.slice(2)))
      } catch {
        diagnostics.push(`${item.name}: export target ${target} is missing; run the build before the release gate`)
      }
    }

    try {
      await access(join(packageRoot, 'README.md'))
    } catch {
      diagnostics.push(`${item.name}: package README.md is missing`)
    }
  }

  const rendererIds = new Set(release.renderers.map(renderer => renderer.id))
  const rendererPackages = new Set(release.renderers.map(renderer => renderer.package))
  for (const renderer of rendererDocs) {
    if (!rendererIds.has(renderer)) diagnostics.push(`renderer ${renderer} is missing from release/manifest.json`)
    try {
      await access(join(root, `docs/getting-started/${renderer}.md`))
    } catch {
      diagnostics.push(`renderer ${renderer} quick start is missing`)
    }
  }
  for (const packageName of rendererPackages) {
    if (!names.has(packageName)) diagnostics.push(`renderer package ${packageName} is not in the public package graph`)
  }

  for (const doc of requiredDocs) {
    try {
      await access(join(root, doc))
    } catch {
      diagnostics.push(`required release document is missing: ${doc}`)
    }
  }

  const changeset = await readJson(join(root, '.changeset/config.json'))
  const fixed = new Set(Array.isArray(changeset.fixed?.[0]) ? changeset.fixed[0] : [])
  for (const name of names) {
    if (!fixed.has(name)) diagnostics.push(`${name}: missing from the Changesets fixed group`)
  }

  const adrFiles = await readdir(join(root, 'docs/architecture/adrs'))
  const adrNumbers = new Map()
  for (const file of adrFiles) {
    const number = /^(\d{4})-/.exec(file)?.[1]
    if (!number) continue
    const previous = adrNumbers.get(number)
    if (previous) diagnostics.push(`duplicate ADR number ${number}: ${previous}, ${file}`)
    else adrNumbers.set(number, file)
  }

  const changelog = await readFile(join(root, 'CHANGELOG.md'), 'utf8').catch(() => '')
  if (!changelog.includes(`## ${release.version}`)) diagnostics.push(`CHANGELOG.md has no ${release.version} entry`)

  const releaseWorkflow = await readFile(join(root, '.github/workflows/release.yml'), 'utf8').catch(() => '')
  if (!releaseWorkflow.includes('artifact="./artifacts/${base/\\//-}-$version.tgz"')) {
    diagnostics.push('release workflow must publish an explicit local tarball path')
  }
  if (!releaseWorkflow.includes('test -f "$artifact"')) {
    diagnostics.push('release workflow must verify each tarball exists before npm publish')
  }
  if (!releaseWorkflow.includes('registry-url: https://registry.npmjs.org')) {
    diagnostics.push('release workflow must configure npm registry authentication')
  }

  return { diagnostics, release }
}

export const assertRelease = async root => {
  const result = await inspectRelease(root)
  if (result.diagnostics.length > 0) {
    throw new Error(`release gate failed:\n${result.diagnostics.map(item => `- ${item}`).join('\n')}`)
  }
  return result.release
}

export const releaseRepositoryUrl = repositoryUrl
