import { docs } from '@/.source'
import { getSlugs, loader } from 'fumadocs-core/source'

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  slugs: info => info.name === 'README'
    ? info.dirname.split('/').filter(Boolean)
    : getSlugs(info),
})
