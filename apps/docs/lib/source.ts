import { docs } from '@/.source'
import { getSlugs, loader } from 'fumadocs-core/source'
import type { PageTree } from 'fumadocs-core/server'
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

function isPageTreeNode(node: PageTree.Node | null): node is PageTree.Node {
  return node !== null
}

function filterTree(node: PageTree.Root): PageTree.Root
function filterTree(node: PageTree.Node): PageTree.Node | null
function filterTree(node: PageTree.Root | PageTree.Node): PageTree.Root | PageTree.Node | null {
  if ('type' in node && node.type === 'page') {
    const path = node.$ref?.file ?? node.url.replace(/^\/docs\/?/, '')
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
  if ('children' in node) {
    const children = node.children.map(filterTree).filter(isPageTreeNode)
    if (children.length === 0 && 'type' in node && node.type === 'folder') return null
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
        return undefined
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
      )
    })
  },
} as typeof base
