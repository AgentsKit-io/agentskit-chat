import { source } from '@/lib/source'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { Card, Cards } from 'fumadocs-ui/components/card'
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
  return <DocsPage toc={page.data.toc} editOnGithub={{ owner: 'AgentsKit-io', repo: 'agentskit-chat', sha: 'main', path: `docs/${page.file?.path ?? ''}` }}>
    <DocsTitle>{page.data.title}</DocsTitle>
    {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
    <p className="mb-6 text-xs"><Link className="underline" href={`/raw/${rawPath}`}>View canonical Markdown</Link></p>
    <DocsBody><Content components={{ Card, Cards }} /></DocsBody>
  </DocsPage>
}

export function generateStaticParams() { return source.generateParams() }

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) return {}
  const path = (slug ?? []).join('/')
  const canonical = `${siteUrl}/docs${path ? `/${path}` : ''}`
  return { title: page.data.title, description: page.data.description, alternates: { canonical }, openGraph: { title: page.data.title, description: page.data.description, url: canonical, type: 'article' } }
}
