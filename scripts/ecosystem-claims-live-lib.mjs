const claimReaders = {
  agentskit: {
    packages: body => body.counts?.packages,
    'framework-bindings': body => body.counts?.frameworkBindings,
    'native-adapters': body => body.counts?.nativeAdapters,
    integrations: body => body.counts?.integrations,
    'catalog-providers': body => body.counts?.catalogProviders,
    'catalog-models': body => body.counts?.catalogModels,
    skills: body => body.counts?.skills,
    'memory-backends': body => body.counts?.memoryBackends,
    recipes: body => body.counts?.recipes,
    'core-size-kb-gzip': body => body.coreSizeKbGzip,
  },
  registry: {
    'published-agents': body => body.agents?.length,
  },
  playbook: {
    pillars: body => body.counts?.pillars,
    patterns: body => body.counts?.patterns,
    'gate-scripts': body => body.counts?.gateScripts,
    'delivery-phases': body => body.counts?.phases,
    templates: body => body.counts?.templates,
  },
  akos: {
    'registered-verbs': body => body.counts?.verbs,
  },
}

export const verifyLiveEndpointClaims = async ({ contract, fetchImpl = fetch }) => {
  const blockers = []
  const verified = []
  for (const product of contract.products) {
    if (product.verification !== 'verified' || product.source.type !== 'endpoint') continue
    const readers = claimReaders[product.productId]
    if (!readers) {
      blockers.push(`${product.productId} has verified endpoint claims without a live reader`)
      continue
    }
    try {
      const response = await fetchImpl(product.source.url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      for (const claim of product.claims) {
        const reader = readers[claim.id]
        if (!reader) {
          blockers.push(`${product.productId}.${claim.id} has no live reader`)
          continue
        }
        const actual = reader(body)
        if (actual !== claim.value) blockers.push(`${product.productId}.${claim.id} is ${actual ?? 'missing'}; ledger expects ${claim.value}`)
        else verified.push({ productId: product.productId, claimId: claim.id, value: actual })
      }
    } catch (error) {
      blockers.push(`${product.productId} endpoint failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { checkedAt: new Date().toISOString(), ready: blockers.length === 0, blockers, verified }
}
