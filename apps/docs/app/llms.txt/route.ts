import { collectCanonicalDocs, publicDocSlug } from '@/lib/docs-index'
import { allEcosystemProducts } from '@/lib/ecosystem'

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
  const ecosystem = allEcosystemProducts.map(product =>
    `- ${product.label} (${product.maturity}): ${product.docs}\n  LLM index: ${product.llms}`,
  )
  return new Response(
    `# AgentsKit Chat\n\n> Cross-framework chat applications built on AgentsKit.\n\n- Repository: https://github.com/AgentsKit-io/agentskit-chat\n- Deterministic knowledge: ${site}/deterministic/knowledge.json\n- Full public corpus: ${site}/llms-full.txt\n- Agent entry point: ${site}/for-agents\n\n## Ecosystem\n\n${ecosystem.join('\n')}\n\n## Documentation\n\n${rows.join('\n')}\n`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  )
}
