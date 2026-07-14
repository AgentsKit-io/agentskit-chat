import { KNOWLEDGE_HASH } from '@/lib/knowledge'

export const dynamic = 'force-static'
export async function GET() { return Response.json({ protocol: 'agentskit.chat.site', version: 1, siteId: 'agentskit-chat-docs', artifact: { href: '/deterministic/knowledge.json', contentHash: KNOWLEDGE_HASH }, fallback: { mode: 'backend' } }, { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } }) }
