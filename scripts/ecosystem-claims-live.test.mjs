import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { verifyLiveEndpointClaims } from './ecosystem-claims-live-lib.mjs'

const contract = JSON.parse(readFileSync(new URL('../ecosystem-contract-claims.json', import.meta.url), 'utf8'))
const bodies = {
  'https://www.agentskit.io/api/stats.json': {
    counts: { packages: 22, frameworkBindings: 7, nativeAdapters: 25, integrations: 50, catalogProviders: 140, catalogModels: 5162, skills: 21, memoryBackends: 17, recipes: 69 },
    coreSizeKbGzip: 10,
  },
  'https://registry.agentskit.io/r/index.json': { agents: Array.from({ length: 346 }, () => ({})) },
  'https://playbook.agentskit.io/api/stats.json': { counts: { pillars: 6, patterns: 87, gateScripts: 13, phases: 6, templates: 6 } },
  'https://akos.agentskit.io/api/stats.json': { counts: { verbs: 540 } },
}
const fetchImpl = async url => ({ ok: true, status: 200, json: async () => bodies[url] })

describe('live ecosystem endpoint claims', () => {
  it('recomputes every verified endpoint-derived claim', async () => {
    const result = await verifyLiveEndpointClaims({ contract, fetchImpl })
    expect(result.ready).toBe(true)
    expect(result.verified).toHaveLength(17)
  })

  it('fails closed when an endpoint count drifts', async () => {
    const driftedFetch = async url => ({ ok: true, status: 200, json: async () => url.includes('akos') ? { counts: { verbs: 541 } } : bodies[url] })
    const result = await verifyLiveEndpointClaims({ contract, fetchImpl: driftedFetch })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('akos.registered-verbs is 541; ledger expects 540')
  })
})
