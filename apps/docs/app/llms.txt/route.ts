import { collectCanonicalDocs } from '@/lib/docs-index'

export const dynamic = 'force-static'

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'
  const documents = await collectCanonicalDocs()
  const rows = documents.map(document => {
    const slug = document.path.replace(/\.mdx?$/, '').replace(/\/README$/, '')
    return `- [${document.title}](${site}/docs/${slug}) — ${document.description}\n  Raw: ${site}/raw/${document.path}`
  })
  return new Response(`# AgentsKit Chat\n\n> Cross-framework chat applications built on AgentsKit.\n\n- Repository: https://github.com/AgentsKit-io/agentskit-chat\n- Deterministic knowledge: ${site}/deterministic/knowledge.json\n- Full corpus: ${site}/llms-full.txt\n\n## Documentation\n\n${rows.join('\n')}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
