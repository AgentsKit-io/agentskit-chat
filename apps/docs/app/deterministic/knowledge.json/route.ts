import { localKnowledgeArtifact } from '@/lib/knowledge'

export const dynamic = 'force-static'
export async function GET() { return Response.json(localKnowledgeArtifact, { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } }) }
