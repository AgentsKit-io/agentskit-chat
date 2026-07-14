import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')

const readJson = path => JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8'))

export function computeReadmeClaims() {
  const packageDirs = readdirSync(join(REPO_ROOT, 'packages')).filter(dir =>
    existsSync(join(REPO_ROOT, 'packages', dir, 'package.json')),
  )
  const publicPackages = packageDirs.filter(dir => {
    const manifest = readJson(`packages/${dir}/package.json`)
    return manifest.private !== true
  })
  const renderers = ['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular']
  const rendererPackages = publicPackages.filter(dir => renderers.includes(dir))
  const catalogSupport = readJson('packages/react/catalog-support.json')
  const standardComponents = Object.keys(catalogSupport.components).length
  const conformanceRows = readFileSync(join(REPO_ROOT, 'docs/conformance/matrix.generated.md'), 'utf8')
    .split('\n')
    .filter(line => line.startsWith('|') && !line.includes('Requirement') && !line.startsWith('|---'))
    .length
  const gettingStartedGuides = readdirSync(join(REPO_ROOT, 'docs/getting-started'))
    .filter(file => file.endsWith('.md') && file !== 'README.md').length
  const exampleApps = readdirSync(join(REPO_ROOT, 'apps')).filter(dir => dir.startsWith('example-')).length
  const architectureAdrs = readdirSync(join(REPO_ROOT, 'docs/architecture/adrs')).filter(file => file.endsWith('.md')).length
  const docBridgeIndex = readJson('.doc-bridge/index.json')
  const agentHandoffs = docBridgeIndex.knowledge?.length ?? 0

  return {
    publicPackages: publicPackages.length,
    rendererPackages: rendererPackages.length,
    standardComponents,
    conformanceRequirements: conformanceRows,
    gettingStartedGuides,
    exampleApps,
    architectureAdrs,
    agentHandoffs,
    version: readJson('package.json').version,
  }
}