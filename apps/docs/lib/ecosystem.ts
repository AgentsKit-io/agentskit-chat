import manifest from '../../../ecosystem.json'
import snapshot from './ecosystem-stats.snapshot.json'

/** Live-ish counts from AgentsKit ecosystem snapshot (regenerate when agentskit updates). */
export const ecosystem = {
  packages: snapshot.counts.packages,
  frameworkBindings: snapshot.counts.frameworkBindings,
  nativeAdapters: snapshot.counts.nativeAdapters,
  integrations: snapshot.counts.integrations,
  catalogProviders: snapshot.counts.catalogProviders,
  catalogModels: snapshot.counts.catalogModels,
  skills: snapshot.counts.skills,
  memoryBackends: snapshot.counts.memoryBackends,
  recipes: snapshot.counts.recipes,
} as const

export const agentskitDocs = {
  home: 'https://www.agentskit.io/docs',
  adapters: 'https://www.agentskit.io/docs/data/providers',
  tools: 'https://www.agentskit.io/docs/agents/tools/integrations',
  memory: 'https://www.agentskit.io/docs/data/memory',
  rag: 'https://www.agentskit.io/docs/data/rag',
  runtime: 'https://www.agentskit.io/docs/agents/runtime',
  examples: 'https://www.agentskit.io/docs/reference/examples',
  react: 'https://www.agentskit.io/docs/ui/react',
} as const

export const allEcosystemProducts = manifest.products
  .toSorted((left, right) => left.navigation.order - right.navigation.order)
  .map(product => ({
    id: product.id,
    label: product.shortName,
    href: product.id === 'agentskit-chat' ? '/docs' : product.surfaces.home,
    docs: product.surfaces.docs,
    llms: product.surfaces.llms,
    maturity: product.maturity,
  }))

export const ecosystemBarProducts = allEcosystemProducts.filter(product => {
  const source = manifest.products.find(candidate => candidate.id === product.id)
  return source?.navigation.showInBar === true
})
