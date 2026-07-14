#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeReadmeClaims, REPO_ROOT } from './compute-readme-claims.mjs'

const check = process.argv.includes('--check')
const stats = computeReadmeClaims()

const claims = {
  schemaVersion: 1,
  productId: 'agentskit-chat',
  version: stats.version,
  claims: [
    {
      id: 'public-packages',
      value: stats.publicPackages,
      noun: 'public npm packages',
      evidence: { type: 'repository-derivation', path: 'packages/*/package.json', summary: 'Non-private workspace packages with public publishConfig.' },
    },
    {
      id: 'renderers',
      value: stats.rendererPackages,
      noun: 'native renderers',
      evidence: { type: 'repository-derivation', path: 'release/manifest.json#/renderers', summary: 'Native renderer subpaths declared in the public release manifest.' },
    },
    {
      id: 'standard-components',
      value: stats.standardComponents,
      noun: 'standard components',
      evidence: { type: 'repository-derivation', path: 'packages/react/catalog-support.json', summary: 'Registered application components in the closed catalog.' },
    },
    {
      id: 'conformance-requirements',
      value: stats.conformanceRequirements,
      noun: 'conformance requirements',
      evidence: { type: 'repository-derivation', path: 'docs/conformance/matrix.generated.md', summary: 'Release-blocking renderer and protocol requirements.' },
    },
    {
      id: 'getting-started-guides',
      value: stats.gettingStartedGuides,
      noun: 'renderer quick starts',
      evidence: { type: 'repository-derivation', path: 'docs/getting-started/*.md', summary: 'Framework-specific adoption guides.' },
    },
    {
      id: 'example-apps',
      value: stats.exampleApps,
      noun: 'example applications',
      evidence: { type: 'repository-derivation', path: 'apps/example-*', summary: 'Runnable proof apps for renderers and shared definitions.' },
    },
    {
      id: 'architecture-adrs',
      value: stats.architectureAdrs,
      noun: 'architecture ADRs',
      evidence: { type: 'repository-derivation', path: 'docs/architecture/adrs', summary: 'Public architecture decision records.' },
    },
    {
      id: 'agent-handoffs',
      value: stats.agentHandoffs,
      noun: 'agent handoffs',
      evidence: { type: 'repository-derivation', path: '.doc-bridge/index.json#/handoffs', summary: 'Doc Bridge agent-handoff entries for ownership routing.' },
    },
  ],
}

const json = `${JSON.stringify(claims, null, 2)}\n`
const target = join(REPO_ROOT, 'ecosystem-claims.json')

if (check) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== json) {
    console.error('ecosystem-claims.json is stale — run: node scripts/gen-ecosystem-claims.mjs')
    process.exit(1)
  }
  console.log('ecosystem claims ok')
} else {
  writeFileSync(target, json)
  console.log('wrote ecosystem-claims.json')
}
