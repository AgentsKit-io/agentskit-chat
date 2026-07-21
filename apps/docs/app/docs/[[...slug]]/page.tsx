import { source } from '@/lib/source'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { docsMdxComponents } from '@/components/docs-mdx'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export default async function DocumentationPage({ params }: { readonly params: Promise<{ readonly slug?: string[] }> }) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  const Content = page.data.body
  const path = (slug ?? []).join('/')
  const rawPath = page.file?.path ?? `${path || 'index'}.md`
  const isHome = !slug || slug.length === 0
  return <DocsPage toc={page.data.toc} editOnGithub={{ owner: 'AgentsKit-io', repo: 'agentskit-chat', sha: 'main', path: `docs/${page.file?.path ?? ''}` }}>
    <DocsTitle>{page.data.title}</DocsTitle>
    {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
    {isHome ? (
      <div className="docs-hero-banner not-prose mb-6">
        <div>
          <p className="m-0 text-sm font-semibold tracking-wide text-fd-muted-foreground uppercase">Product docs</p>
          <p>
            Install, run, connect backends, add RAG, style shells, and ship native chat on every
            AgentsKit surface — without the internal ADR/PRD noise.
          </p>
        </div>
        <div className="docs-surface-pills" aria-label="Supported surfaces">
          {['React', 'Vue', 'Svelte', 'Solid', 'Angular', 'RN', 'Ink'].map((surface) => (
            <span key={surface}>{surface}</span>
          ))}
        </div>
      </div>
    ) : null}
    <p className="mb-6 text-xs"><Link className="underline" href={`/raw/${rawPath}`}>View canonical Markdown</Link></p>
    <DocsBody><Content components={docsMdxComponents} /></DocsBody>
  </DocsPage>
}

export function generateStaticParams() { return source.generateParams() }

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) return {}
  const path = (slug ?? []).join('/')
  const canonical = `${siteUrl}/docs${path ? `/${path}` : ''}`
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: canonical,
      type: 'article',
      siteName: 'AgentsKit Chat',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AgentsKit Chat — One agent experience. Every surface.' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: ['/opengraph-image'],
    },
  }
}
