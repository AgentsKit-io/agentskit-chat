import { collectCanonicalDocs, publicDocSlug } from '@/lib/docs-index'

export const dynamic = 'force-static'

const concisePaths = new Set([
  'index.mdx',
  'getting-started/README.md',
  'architecture/overview.md',
  'protocol/v1.md',
  'components/catalog.md',
  'backend.md',
  'deployment.md',
  'for-agents/index.md',
])

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'
  const documents = (await collectCanonicalDocs()).filter(document => concisePaths.has(document.path))
  const rows = documents.map(document => {
    const slug = publicDocSlug(document.path)
    return `- [${document.title}](${site}/docs${slug ? `/${slug}` : ''}) — ${document.description}\n  Raw: ${site}/raw/${document.path}`
  })
  return new Response(`# AgentsKit Chat\n\n> Cross-framework chat applications built on AgentsKit.\n\n- Repository: https://github.com/AgentsKit-io/agentskit-chat\n- Deterministic knowledge: ${site}/deterministic/knowledge.json\n- Full corpus: ${site}/llms-full.txt\n- Agent entry point: ${site}/for-agents\n\n## Ecosystem\n\n- AgentsKit: https://www.agentskit.io\n- Registry: https://registry.agentskit.io\n- Playbook: https://playbook.agentskit.io\n- Doc Bridge: https://agentskit-io.github.io/doc-bridge/\n- Code Review: https://github.com/AgentsKit-io/code-review-cli#readme\n- AKOS: https://akos.agentskit.io\n\n## Documentation\n\n${rows.join('\n')}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
