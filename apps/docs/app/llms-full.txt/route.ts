import { collectCanonicalDocs } from '@/lib/docs-index'

export const dynamic = 'force-static'

export async function GET() {
  const documents = await collectCanonicalDocs()
  const body = documents.map(document => `\n\n<!-- ${document.path} -->\n\n${document.body}`).join('')
  return new Response(`# AgentsKit Chat — canonical documentation corpus${body}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
