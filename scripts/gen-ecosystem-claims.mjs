#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeReadmeClaims, REPO_ROOT } from './compute-readme-claims.mjs'

const check = process.argv.includes('--check')
const stats = computeReadmeClaims()
const repositoryEvidence = (path, summary) => ({
  type: 'repository-derivation',
  repo: 'AgentsKit-io/agentskit-chat',
  path,
  summary,
})

const claims = {
  schemaVersion: 1,
  productId: 'agentskit-chat',
  version: stats.version,
  claims: [
    {
      id: 'public-packages',
      value: stats.publicPackages,
      noun: 'public npm packages',
      evidence: repositoryEvidence('packages/*/package.json', 'Non-private workspace packages with public publishConfig.'),
    },
    {
      id: 'renderers',
      value: stats.rendererPackages,
      noun: 'native renderers',
      evidence: repositoryEvidence('release/manifest.json#/renderers', 'Native renderer subpaths declared in the public release manifest.'),
    },
    {
      id: 'standard-components',
      value: stats.standardComponents,
      noun: 'standard components',
      evidence: repositoryEvidence('packages/react/catalog-support.json', 'Registered application components in the closed catalog.'),
    },
    {
      id: 'conformance-requirements',
      value: stats.conformanceRequirements,
      noun: 'conformance requirements',
      evidence: repositoryEvidence('docs/conformance/matrix.generated.md', 'Release-blocking renderer and protocol requirements.'),
    },
    {
      id: 'getting-started-guides',
      value: stats.gettingStartedGuides,
      noun: 'renderer quick starts',
      evidence: repositoryEvidence('docs/getting-started/*.mdx', 'Framework-specific adoption guides.'),
    },
    {
      id: 'example-apps',
      value: stats.exampleApps,
      noun: 'example applications',
      evidence: repositoryEvidence('apps/example-*', 'Runnable proof apps for renderers and shared definitions.'),
    },
    {
      id: 'architecture-adrs',
      value: stats.architectureAdrs,
      noun: 'architecture ADRs',
      evidence: repositoryEvidence('docs/architecture/adrs', 'Public architecture decision records.'),
    },
    {
      id: 'agent-handoffs',
      value: stats.agentHandoffs,
      noun: 'agent handoffs',
      evidence: repositoryEvidence('.doc-bridge/index.json#/handoffs', 'Doc Bridge agent-handoff entries for ownership routing.'),
    },
  ],
}

const json = `${JSON.stringify(claims, null, 2)}\n`
const target = join(REPO_ROOT, 'ecosystem-claims.json')
const contractTarget = join(REPO_ROOT, 'ecosystem-contract-claims.json')
const contract = JSON.parse(readFileSync(contractTarget, 'utf8'))
const localContract = contract.products.find(product => product.productId === claims.productId)
if (!localContract) throw new Error(`ecosystem-contract-claims.json is missing ${claims.productId}`)
localContract.source = { type: 'repository', repo: 'AgentsKit-io/agentskit-chat' }
localContract.verification = 'verified'
localContract.claims = claims.claims
const contractJson = `${JSON.stringify(contract, null, 2)}\n`

if (check) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== json
    || readFileSync(contractTarget, 'utf8') !== contractJson) {
    console.error('ecosystem claim ledgers are stale — run: node scripts/gen-ecosystem-claims.mjs')
    process.exit(1)
  }
  console.log('ecosystem claims ok (local and contract ledgers)')
} else {
  writeFileSync(target, json)
  writeFileSync(contractTarget, contractJson)
  console.log('wrote ecosystem-claims.json and synchronized the local contract entry')
}
