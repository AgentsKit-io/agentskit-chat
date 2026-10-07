#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagesRoot = path.join(root, 'packages')
const snapshotPath = path.join(root, 'docs/stability/public-api-v1.json')
const update = process.argv.includes('--update')
const unknownArgs = process.argv.slice(2).filter((arg) => arg !== '--update')

if (unknownArgs.length) {
  console.error(`public-api: unknown argument ${unknownArgs[0]}`)
  console.error('Usage: pnpm check:public-api [--update]')
  process.exit(2)
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const kindOrder = ['type', 'value']
const sourceEntries = {
  '@agentskit/chat': {
    '.': '../chat/src/index.ts',
    './drizzle-pg': '../chat/src/drizzle-pg.ts',
    './protocol': '../protocol/src/index.ts',
    './protocol/fixtures': '../protocol/src/fixtures.ts',
    './server': '../server/src/index.ts',
    './devtools': '../devtools/src/index.ts',
    './react': '../react/src/index.tsx',
    './react-native': '../react-native/src/index.tsx',
    './ink': '../ink/src/index.tsx',
    './vue': '../vue/src/index.ts',
    './solid': '../solid/src/index.tsx',
    './svelte': '../svelte/src/index.ts',
    './angular': '../angular/src/index.ts',
  },
  '@agentskit/chat-cli': { '.': '../cli/src/index.ts' },
}

function exportTargets(entry) {
  if (typeof entry === 'string') return [entry]
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []

  const conditions = Object.keys(entry)
  const ordered = ['types', 'import', 'require', 'default', ...conditions]
  for (const condition of ordered) {
    if (condition in entry) {
      const targets = exportTargets(entry[condition])
      if (targets.length) return targets
    }
  }
  return []
}

function packageManifests() {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(packagesRoot, entry.name, 'package.json')
      if (!existsSync(manifestPath)) return null
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      return manifest.private === true ? null : { directory: entry.name, manifest }
    })
    .filter(Boolean)
    .sort((a, b) => compare(a.manifest.name, b.manifest.name))
}

function sourcePath(packageInfo, subpath) {
  const relative = sourceEntries[packageInfo.manifest.name]?.[subpath]
  if (!relative) throw new Error(`${packageInfo.manifest.name} ${subpath}: source entry is not mapped`)
  const source = path.resolve(packagesRoot, packageInfo.directory, relative)
  if (!existsSync(source)) throw new Error(`${packageInfo.manifest.name} ${subpath}: source entry not found: ${source}`)
  return source
}

function symbolKinds(checker, symbol) {
  let resolved = symbol
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try {
      resolved = checker.getAliasedSymbol(symbol)
    } catch {
      // Keep the original flags if an alias cannot be resolved.
    }
  }
  const flags = resolved.flags
  const kinds = []
  if (flags & ts.SymbolFlags.Type) kinds.push('type')
  if (flags & ts.SymbolFlags.Value) kinds.push('value')
  if (flags & (ts.SymbolFlags.NamespaceModule | ts.SymbolFlags.ValueModule) && !kinds.includes('value')) {
    kinds.push('value')
  }
  if (!kinds.length) kinds.push('value')
  return kinds.sort((a, b) => kindOrder.indexOf(a) - kindOrder.indexOf(b))
}

const publishedPackages = packageManifests()
const packageSources = new Map()
for (const packageInfo of publishedPackages) {
  const exports = packageInfo.manifest.exports ?? { '.': packageInfo.manifest.types ?? packageInfo.manifest.main }
  const entries = Object.keys(exports).some((key) => key === '.' || key.startsWith('./')) ? exports : { '.': exports }
  const subpaths = new Map()
  for (const [subpath, entry] of Object.entries(entries).sort(([a], [b]) => compare(a, b))) {
    if (!exportTargets(entry).length) throw new Error(`${packageInfo.manifest.name} ${subpath}: no supported export target found`)
    subpaths.set(subpath, sourcePath(packageInfo, subpath))
  }
  packageSources.set(packageInfo.manifest.name, { packageInfo, subpaths })
}

const projects = new Map()
function loadProject(configPath) {
  if (projects.has(configPath)) return projects.get(configPath)
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) throw new Error(`${configPath}: ${ts.flattenDiagnosticMessageText(config.error.messageText, '\n')}`)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), undefined, configPath)
  const project = { program: ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options }), checker: undefined }
  project.checker = project.program.getTypeChecker()
  projects.set(configPath, project)
  return project
}
const packages = {}

for (const [name, { subpaths }] of packageSources) {
  const packageSubpaths = {}
  for (const [subpath, source] of subpaths) {
    const configPath = path.resolve(path.dirname(source), '..', 'tsconfig.json')
    const project = loadProject(configPath)
    const sourceFile = project.program.getSourceFile(source)
    const moduleSymbol = sourceFile && project.checker.getSymbolAtLocation(sourceFile)
    if (!sourceFile || !moduleSymbol) throw new Error(`${name} ${subpath}: unable to inspect exports from ${source}`)
    const symbols = project.checker.getExportsOfModule(moduleSymbol)
      .map((symbol) => ({ name: symbol.name, kinds: symbolKinds(project.checker, symbol) }))
      .sort((a, b) => compare(a.name, b.name))
    packageSubpaths[subpath] = { symbols }
  }
  packages[name] = { subpaths: Object.fromEntries(Object.entries(packageSubpaths).sort(([a], [b]) => compare(a, b))) }
}

const snapshot = { schemaVersion: 1, packages }
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`

function showDiff(previous, current) {
  const oldPackages = previous.packages ?? {}
  const newPackages = current.packages
  const changes = []
  for (const name of [...new Set([...Object.keys(oldPackages), ...Object.keys(newPackages)])].sort(compare)) {
    const oldSubpaths = oldPackages[name]?.subpaths ?? {}
    const newSubpaths = newPackages[name]?.subpaths ?? {}
    for (const subpath of [...new Set([...Object.keys(oldSubpaths), ...Object.keys(newSubpaths)])].sort(compare)) {
      const before = oldSubpaths[subpath]
      const after = newSubpaths[subpath]
      if (!before) changes.push(`  + ${name} ${subpath}`)
      else if (!after) changes.push(`  - ${name} ${subpath}`)
      if (!before || !after) continue
      const oldSymbols = new Map((before.symbols ?? []).map((symbol) => [symbol.name, symbol.kinds]))
      const newSymbols = new Map((after.symbols ?? []).map((symbol) => [symbol.name, symbol.kinds]))
      for (const symbol of [...new Set([...oldSymbols.keys(), ...newSymbols.keys()])].sort(compare)) {
        if (!oldSymbols.has(symbol)) changes.push(`  + ${name} ${subpath} ${symbol} [${newSymbols.get(symbol).join('|')}]`)
        else if (!newSymbols.has(symbol)) changes.push(`  - ${name} ${subpath} ${symbol} [${oldSymbols.get(symbol).join('|')}]`)
        else if (oldSymbols.get(symbol).join('|') !== newSymbols.get(symbol).join('|')) {
          changes.push(`  ~ ${name} ${subpath} ${symbol}: [${oldSymbols.get(symbol).join('|')}] -> [${newSymbols.get(symbol).join('|')}]`)
        }
      }
    }
  }
  if (!changes.length) changes.push('  snapshot formatting or metadata changed')
  console.error(changes.join('\n'))
}

if (update) {
  mkdirSync(path.dirname(snapshotPath), { recursive: true })
  writeFileSync(snapshotPath, serialized)
  console.log(`public-api: updated ${path.relative(root, snapshotPath)} (${publishedPackages.length} packages)`)
} else {
  if (!existsSync(snapshotPath)) {
    console.error(`public-api: snapshot missing at ${path.relative(root, snapshotPath)}`)
    console.error('Run pnpm check:public-api:update to create it.')
    process.exit(1)
  }
  const previous = readFileSync(snapshotPath, 'utf8')
  if (previous !== serialized) {
    console.error(`public-api: exported API drifted from ${path.relative(root, snapshotPath)}:`)
    try {
      showDiff(JSON.parse(previous), snapshot)
    } catch {
      console.error('  baseline is invalid JSON or has an unsupported schema')
    }
    console.error('If this change is intentional, run pnpm check:public-api:update and review the diff.')
    process.exit(1)
  }
  console.log(`public-api: ok — ${publishedPackages.length} packages, ${[...packageSources.values()].reduce((count, item) => count + item.subpaths.size, 0)} export subpaths`)
}
