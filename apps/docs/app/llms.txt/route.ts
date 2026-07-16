import { collectCanonicalDocs, publicDocSlug } from '@/lib/docs-index'
import ecosystem from '../../../../ecosystem.json'
import { formatEcosystemLlmsBlock } from '@/lib/ecosystem-llms-block'

export const dynamic = 'force-static'

/** Curated public product entry points (must match files under docs/ that pass isPublicDocPath). */
const concisePaths = new Set([
  'index.mdx',
  'getting-started/index.mdx',
  'guides/install-and-run.mdx',
  'guides/connect-backend.mdx',
  'components/catalog.mdx',
  'components/choice-list.mdx',
  'examples/components.mdx',
  'server.mdx',
  'backend.mdx',
  'sessions.mdx',
  'deployment.mdx',
  'actions/policy.mdx',
  'actions/confirmation.mdx',
  'releases/stability.md',
  'releases/compatibility.md',
])

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'
  const documents = (await collectCanonicalDocs()).filter(document => concisePaths.has(document.path))
  const rows = documents.map(document => {
    const slug = publicDocSlug(document.path)
    return `- [${document.title}](${site}/docs${slug ? `/${slug}` : ''}) — ${document.description}\n  Raw: ${site}/raw/${document.path}`
  })
  const products = (
    ecosystem.products as Array<{
      id: string
      name: string
      role?: string
      promise: string
      maturity?: string
      surfaces: { home?: string; docs?: string; llms?: string }
      navigation: { order: number }
    }>
  ).toSorted((left, right) => left.navigation.order - right.navigation.order)

  const ecosystemLines = formatEcosystemLlmsBlock({
    products,
    currentProductId: 'agentskit-chat',
    prefer: 'docs',
  })

  return new Response(
    [
      '# AgentsKit Chat',
      '',
      '> Cross-framework chat applications built on AgentsKit.',
      '',
      '- Repository: https://github.com/AgentsKit-io/agentskit-chat',
      `- Deterministic knowledge: ${site}/deterministic/knowledge.json`,
      `- Full corpus: ${site}/llms-full.txt`,
      `- Agent entry point: ${site}/for-agents`,
      '',
      ...ecosystemLines,
      '## Documentation',
      '',
      ...rows,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  )
}
