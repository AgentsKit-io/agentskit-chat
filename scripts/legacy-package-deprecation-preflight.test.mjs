import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runLegacyDeprecationPreflight } from './legacy-package-deprecation-preflight-lib.mjs'

const adoption = JSON.parse(readFileSync(new URL('../ecosystem-adoption.json', import.meta.url), 'utf8'))
const plan = JSON.parse(readFileSync(new URL('../release/legacy-package-deprecations.json', import.meta.url), 'utf8'))
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const consolidated = {
  'dist-tags': { latest: '0.4.1' },
  versions: {
    '0.3.0': {
      exports: Object.fromEntries(plan.packages.map(entry => [`.${entry.replacement.slice('@agentskit/chat'.length)}`, './dist/index.js'])),
    },
    '0.4.0': {
      exports: Object.fromEntries(plan.packages.map(entry => [`.${entry.replacement.slice('@agentskit/chat'.length)}`, './dist/index.js'])),
    },
    '0.4.1': {
      exports: Object.fromEntries(plan.packages.map(entry => [`.${entry.replacement.slice('@agentskit/chat'.length)}`, './dist/index.js'])),
    },
  },
}

const createFetch = ({ deprecated = false, brokenUrl = false, failedCi = false } = {}) => async url => {
  if (brokenUrl && url === plan.migrationUrl) return response({}, 404)
  if (url.startsWith('https://api.github.com/repos/')) {
    return response({ status: 'completed', conclusion: failedCi ? 'failure' : 'success' })
  }
  if (url.endsWith(encodeURIComponent('@agentskit/chat'))) return response(consolidated)
  const legacy = plan.packages.find(entry => url.includes(encodeURIComponent(entry.name)))
  if (legacy) return response({ 'dist-tags': { latest: '0.2.0' }, versions: { '0.1.0': {}, '0.2.0': deprecated ? { deprecated: 'old' } : {} } })
  return response({})
}

describe('legacy package live preflight', () => {
  it('requires reachable evidence, consolidated exports, and clean npm metadata', async () => {
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl: createFetch() })
    expect(result.ready).toBe(true)
    expect(result.legacyPackages).toHaveLength(10)
    expect(result.privateAttestations).toEqual([{ id: 'akos-product-chats', attestation: 'chat-convergence-pass' }])
  })

  it('fails closed on public evidence or existing npm deprecation metadata', async () => {
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl: createFetch({ deprecated: true, brokenUrl: true }) })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain(`${plan.migrationUrl} returned HTTP 404`)
    expect(result.blockers.some(blocker => blocker.includes('is already deprecated'))).toBe(true)
  })

  it('combines live checks with deterministic adoption readiness', async () => {
    const blocked = structuredClone(adoption)
    const docs = blocked.consumers.find(consumer => consumer.id === 'agentskit-chat-docs')
    docs.status = 'deployment-required'
    docs.legacyPackages = ['@agentskit/chat-react']
    docs.evidence.production = { status: 'missing' }
    const result = await runLegacyDeprecationPreflight({ adoption: blocked, plan, fetchImpl: createFetch() })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('agentskit-chat-docs is deployment-required')
    expect(result.blockers.some(blocker => blocker.includes('still declares @agentskit/chat-react'))).toBe(true)
  })

  it('fails closed when npm publishes any version after the audited snapshot', async () => {
    const fetchImpl = async url => {
      if (url.startsWith('https://api.github.com/repos/')) return response({ status: 'completed', conclusion: 'success' })
      if (url.endsWith(encodeURIComponent('@agentskit/chat'))) return response(consolidated)
      const legacy = plan.packages.find(entry => url.includes(encodeURIComponent(entry.name)))
      if (legacy) return response({ 'dist-tags': { latest: '9.9.9' }, versions: { '0.1.0': {}, '0.2.0': {}, '9.9.9': {} } })
      return response({})
    }
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl })
    expect(result.ready).toBe(false)
    expect(result.blockers.some(blocker => blocker.includes('latest is 9.9.9; expected 0.2.0'))).toBe(true)
    expect(result.blockers.some(blocker => blocker.includes('published versions are 0.1.0, 0.2.0, 9.9.9'))).toBe(true)
  })

  it('requires the referenced CI run to be completed successfully', async () => {
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl: createFetch({ failedCi: true }) })
    expect(result.ready).toBe(false)
    expect(result.blockers.some(blocker => blocker.includes('completed/failure; expected completed/success'))).toBe(true)
  })

  it('requires each CI run URL to belong to the declared consumer repository', async () => {
    const mismatched = structuredClone(adoption)
    mismatched.consumers[0].evidence.ci.url = 'https://github.com/AgentsKit-io/unrelated/actions/runs/29415738248'
    const result = await runLegacyDeprecationPreflight({ adoption: mismatched, plan, fetchImpl: createFetch() })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('https://github.com/AgentsKit-io/unrelated/actions/runs/29415738248 belongs to AgentsKit-io/unrelated; expected AgentsKit-io/agentskit')
  })

  it('requires every evidenced consolidated version and replacement export', async () => {
    const missingOldVersion = structuredClone(consolidated)
    delete missingOldVersion.versions['0.3.0']
    const fetchImpl = async url => {
      if (url.startsWith('https://api.github.com/repos/')) return response({ status: 'completed', conclusion: 'success' })
      if (url.endsWith(encodeURIComponent('@agentskit/chat'))) return response(missingOldVersion)
      const legacy = plan.packages.find(entry => url.includes(encodeURIComponent(entry.name)))
      if (legacy) return response({ 'dist-tags': { latest: '0.2.0' }, versions: { '0.1.0': {}, '0.2.0': {} } })
      return response({})
    }
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl })
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('@agentskit/chat@0.3.0 is missing from the npm registry')
    expect(result.blockers).toContain('@agentskit/chat@0.3.0 does not export ./protocol')
  })

  it('deduplicates CI runs and sends auth only to the GitHub API', async () => {
    const calls = []
    const baseFetch = createFetch()
    const fetchImpl = async (url, options) => {
      calls.push({ url, options })
      return baseFetch(url, options)
    }
    const result = await runLegacyDeprecationPreflight({ adoption, plan, fetchImpl, githubToken: 'test-token' })
    expect(result.ready).toBe(true)
    const repeatedRun = 'https://api.github.com/repos/AgentsKit-io/agentskit/actions/runs/29415738248'
    expect(calls.filter(call => call.url === repeatedRun)).toHaveLength(1)
    expect(calls.find(call => call.url === repeatedRun)?.options.headers.authorization).toBe('Bearer test-token')
    expect(calls.filter(call => !call.url.startsWith('https://api.github.com/')).every(call => call.options?.headers?.authorization === undefined)).toBe(true)
  })
})
