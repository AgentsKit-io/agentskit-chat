import type { MetadataRoute } from 'next'
import { isPublicDocPath } from '@/lib/public-docs'
import { source } from '@/lib/source'

function pageIsPublic(page: { url: string; file?: { path?: string } }): boolean {
  const filePath = page.file?.path
  if (filePath && isPublicDocPath(filePath.replace(/^docs\//, ''))) return true
  const slug = page.url.replace(/^\/docs\/?/, '')
  if (!slug) return true
  return (
    isPublicDocPath(`${slug}.md`)
    || isPublicDocPath(`${slug}.mdx`)
    || isPublicDocPath(`${slug}/index.mdx`)
    || isPublicDocPath(`${slug}/README.md`)
  )
}

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'
  return [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    ...source
      .getPages()
      .filter(pageIsPublic)
      .map(page => ({ url: `${site}${page.url}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ]
}
