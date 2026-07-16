import { docs } from '@/.source'
import { getSlugs, loader, type LoaderOutput, type LoaderConfig } from 'fumadocs-core/source'
import { isPublicDocPath } from './public-docs'

const base = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  slugs: info => info.name === 'README'
    ? info.dirname.split('/').filter(Boolean)
    : info.name === 'index'
      ? info.dirname.split('/').filter(Boolean)
      : getSlugs(info),
})

function filterTree(node: any): any {
  if (!node) return node
  if (node.type === 'page') {
    const file = node.$ref?.file ?? node.file ?? ''
    const path = typeof file === 'string' ? file : file?.path ?? node.url?.replace(/^\/docs\/?/, '') ?? ''
    // Keep separator items
    if (node.name && !node.url) return node
    // pages have url like /docs/...
    const rel = (node.$id ?? path ?? '').toString().replace(/^docs\//, '')
    // If we can't resolve, keep if url looks public
    const url: string = node.url ?? ''
    const slugPath = url.replace(/^\/docs\/?/, '')
    const candidate = rel.includes('.') ? rel : `${slugPath || 'index'}`
    // Allow root
    if (!slugPath || slugPath === '') return node
    // Check against public paths using synthetic file path
    const asFile = slugPath === '' ? 'index.mdx'
      : slugPath.endsWith('.md') || slugPath.endsWith('.mdx') ? slugPath
      : `${slugPath}.md`
    if (isPublicDocPath(asFile) || isPublicDocPath(`${slugPath}/index.mdx`) || isPublicDocPath(`${slugPath}/README.md`)) {
      return node
    }
    return null
  }
  if (node.children) {
    const children = node.children.map(filterTree).filter(Boolean)
    if (children.length === 0 && node.type === 'folder') return null
    return { ...node, children }
  }
  return node
}

export const source = {
  ...base,
  get pageTree() {
    return filterTree(base.pageTree) ?? base.pageTree
  },
  getPage(slug?: string[]) {
    const page = base.getPage(slug)
    if (!page) return page
    const filePath = page.file?.path ?? `${(slug ?? []).join('/')}.md`
    if (!isPublicDocPath(filePath) && (slug?.length ?? 0) > 0) {
      // allow root index
      const joined = (slug ?? []).join('/')
      if (!isPublicDocPath(`${joined}.md`) && !isPublicDocPath(`${joined}.mdx`) && !isPublicDocPath(`${joined}/index.mdx`) && !isPublicDocPath(`${joined}/README.md`)) {
        return undefined as any
      }
    }
    return page
  },
  generateParams() {
    return base.generateParams().filter((p: { slug?: string[] }) => {
      const slug = p.slug ?? []
      if (slug.length === 0) return true
      const joined = slug.join('/')
      return (
        isPublicDocPath(`${joined}.md`)
        || isPublicDocPath(`${joined}.mdx`)
        || isPublicDocPath(`${joined}/index.mdx`)
        || isPublicDocPath(`${joined}/README.md`)
        || isPublicDocPath(`getting-started/${joined.split('/').pop()}.md`)
      )
    })
  },
} as typeof base
