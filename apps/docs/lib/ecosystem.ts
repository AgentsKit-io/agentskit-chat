import manifest from '../../../ecosystem.json'

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
