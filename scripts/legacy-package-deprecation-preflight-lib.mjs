import { parseEcosystemAdoption } from './ecosystem-adoption-lib.mjs'
import { evaluateLegacyDeprecationReadiness, parseLegacyDeprecationPlan } from './legacy-package-deprecation-lib.mjs'

const npmRegistry = 'https://registry.npmjs.org'
const encodePackage = name => encodeURIComponent(name)
const exportKey = replacement => `.${replacement.slice('@agentskit/chat'.length) || ''}`

const fetchJson = async (fetchImpl, url, options = {}) => {
  const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), ...options })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.json()
}

const checkUrl = async (fetchImpl, url, blockers) => {
  try {
    const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
    if (!response.ok) blockers.push(`${url} returned HTTP ${response.status}`)
  } catch (error) {
    blockers.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const checkCiRun = async (fetchImpl, url, expectedRepository, blockers, githubToken) => {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)$/.exec(url)
  if (!match) {
    blockers.push(`${url} is not a canonical GitHub Actions run URL`)
    return
  }
  const [, owner, repository, runId] = match
  if (`${owner}/${repository}`.toLowerCase() !== expectedRepository.toLowerCase()) {
    blockers.push(`${url} belongs to ${owner}/${repository}; expected ${expectedRepository}`)
    return
  }
  const apiUrl = `https://api.github.com/repos/${owner}/${repository}/actions/runs/${runId}`
  try {
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'agentskit-chat-deprecation-preflight',
      ...(githubToken ? { authorization: `Bearer ${githubToken}` } : {}),
    }
    const run = await fetchJson(fetchImpl, apiUrl, { headers })
    if (run.status !== 'completed' || run.conclusion !== 'success') {
      blockers.push(`${url} is ${run.status ?? 'unknown'}/${run.conclusion ?? 'unknown'}; expected completed/success`)
    }
    if (run.html_url !== undefined && run.html_url !== url) blockers.push(`${apiUrl} resolves to unexpected run ${run.html_url}`)
  } catch (error) {
    blockers.push(`${url} CI lookup failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const runLegacyDeprecationPreflight = async ({ adoption, plan, fetchImpl = fetch, githubToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN }) => {
  const manifest = parseEcosystemAdoption(adoption)
  const parsedPlan = parseLegacyDeprecationPlan(plan)
  const deterministic = evaluateLegacyDeprecationReadiness(manifest, parsedPlan)
  const blockers = [...deterministic.blockers]
  const checkedUrls = new Set([parsedPlan.migrationUrl])
  const ciRuns = new Map()
  const productionUrls = [parsedPlan.migrationUrl]

  for (const consumer of manifest.consumers) {
    if (consumer.evidence.visibility !== 'public') continue
    if (consumer.evidence.ci.status === 'pass') {
      checkedUrls.add(consumer.evidence.ci.url)
      ciRuns.set(`${consumer.repository}:${consumer.evidence.ci.url}`, { url: consumer.evidence.ci.url, repository: consumer.repository })
    }
    if (consumer.evidence.production.status === 'pass') {
      checkedUrls.add(consumer.evidence.production.url)
      productionUrls.push(consumer.evidence.production.url)
    }
  }
  await Promise.all([
    ...[...ciRuns.values()].map(run => checkCiRun(fetchImpl, run.url, run.repository, blockers, githubToken)),
    ...productionUrls.map(url => checkUrl(fetchImpl, url, blockers)),
  ])

  let consolidatedPackage
  try {
    consolidatedPackage = await fetchJson(fetchImpl, `${npmRegistry}/${encodePackage('@agentskit/chat')}`)
  } catch (error) {
    blockers.push(`@agentskit/chat registry lookup failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  const latest = consolidatedPackage?.['dist-tags']?.latest
  if (latest !== manifest.currentFrameworkVersion) {
    blockers.push(`@agentskit/chat latest is ${latest ?? 'missing'}; expected ${manifest.currentFrameworkVersion}`)
  }
  for (const version of manifest.supportedConsolidatedVersions) {
    const versionManifest = consolidatedPackage?.versions?.[version]
    if (!versionManifest) blockers.push(`@agentskit/chat@${version} is missing from the npm registry`)
    for (const entry of parsedPlan.packages) {
      const key = exportKey(entry.replacement)
      if (!versionManifest?.exports?.[key]) blockers.push(`@agentskit/chat@${version} does not export ${key}`)
    }
  }

  const npmPackages = []
  for (const entry of parsedPlan.packages) {
    try {
      const packument = await fetchJson(fetchImpl, `${npmRegistry}/${encodePackage(entry.name)}`)
      const packageLatest = packument?.['dist-tags']?.latest
      const versions = Object.entries(packument?.versions ?? {})
      const publishedVersions = versions.map(([version]) => version).sort()
      const expectedVersions = [...entry.expectedVersions].sort()
      const deprecatedVersions = versions
        .filter(([, value]) => typeof value?.deprecated === 'string' && value.deprecated.length > 0)
        .map(([version]) => version)
      if (packageLatest !== entry.expectedLatest) blockers.push(`${entry.name} latest is ${packageLatest ?? 'missing'}; expected ${entry.expectedLatest}`)
      if (publishedVersions.join(',') !== expectedVersions.join(',')) {
        blockers.push(`${entry.name} published versions are ${publishedVersions.join(', ') || 'missing'}; expected ${expectedVersions.join(', ')}`)
      }
      if (deprecatedVersions.length > 0) blockers.push(`${entry.name} is already deprecated at ${deprecatedVersions.join(', ')}`)
      npmPackages.push({ name: entry.name, latest: packageLatest ?? null, publishedVersions, deprecatedVersions })
    } catch (error) {
      blockers.push(`${entry.name} registry lookup failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    ready: blockers.length === 0,
    blockers,
    checkedUrls: [...checkedUrls],
    consolidatedPackage: { name: '@agentskit/chat', latest: latest ?? null, supportedVersions: manifest.supportedConsolidatedVersions },
    legacyPackages: npmPackages,
    privateAttestations: manifest.consumers
      .filter(consumer => consumer.evidence.visibility === 'private-attestation')
      .map(consumer => ({ id: consumer.id, attestation: consumer.evidence.attestation })),
  }
}
