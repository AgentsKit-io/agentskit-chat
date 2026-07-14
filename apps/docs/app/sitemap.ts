import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'
  return [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    ...source.getPages().map(page => ({ url: `${site}${page.url}`, changeFrequency: 'weekly' as const, priority: .7 })),
  ]
}
