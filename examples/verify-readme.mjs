import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeReadmeClaims } from '../scripts/compute-readme-claims.mjs'

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const claims = JSON.parse(readFileSync(join(root, 'ecosystem-claims.json'), 'utf8'))
const computed = computeReadmeClaims()

const claimKeys = {
  'public-packages': 'publicPackages',
  renderers: 'rendererPackages',
  'standard-components': 'standardComponents',
  'conformance-requirements': 'conformanceRequirements',
  'getting-started-guides': 'gettingStartedGuides',
  'example-apps': 'exampleApps',
  'architecture-adrs': 'architectureAdrs',
  'agent-handoffs': 'agentHandoffs',
}

for (const claim of claims.claims) {
  const key = claimKeys[claim.id]
  const actual = computed[key]
  if (actual !== claim.value) throw new Error(`${claim.id}: expected ${claim.value}, computed ${actual}`)
}

console.log(
  `Verified AgentsKit Chat README claims: ${computed.publicPackages} packages, ${computed.rendererPackages} renderers, ${computed.standardComponents} components, ${computed.conformanceRequirements} conformance requirements.`,
)