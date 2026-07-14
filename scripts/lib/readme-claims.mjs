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

const claimLabels = {
  'public-packages': 'Public npm packages',
  renderers: 'Native renderers',
  'standard-components': 'Standard components',
  'conformance-requirements': 'Conformance requirements',
  'getting-started-guides': 'Renderer quick starts',
  'example-apps': 'Example applications',
  'architecture-adrs': 'Architecture ADRs',
  'agent-handoffs': 'Agent handoffs',
}

export function verifyReadmeClaims(claims, computed, readme) {
  for (const claim of claims.claims) {
    const key = claimKeys[claim.id]
    if (typeof key !== 'string' || typeof claimLabels[claim.id] !== 'string') throw new Error(`Unknown README claim: ${claim.id}`)
    const actual = computed[key]
    if (actual !== claim.value) throw new Error(`${claim.id}: expected ${claim.value}, computed ${actual}`)
    const label = claimLabels[claim.id].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const visibleValues = [...readme.matchAll(new RegExp(`^\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|$`, 'gm'))].map(match => match[1])
    if (visibleValues.length !== 1 || visibleValues[0] !== String(claim.value)) {
      throw new Error(`${claim.id}: README proof table must contain exactly one row with value ${claim.value}`)
    }
  }
}
