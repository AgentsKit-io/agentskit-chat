import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const dynamic = 'force-static'

const assets = new Set(['agentschat-architecture.svg', 'agentschat-mark.svg'])
const root = join(process.cwd(), '..', '..', 'docs', 'assets')

export async function GET(_request: Request, context: { readonly params: Promise<{ readonly file: string }> }) {
  const { file } = await context.params
  if (!assets.has(file)) return new Response('Not found', { status: 404 })
  return new Response(await readFile(join(root, file)), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  })
}

export function generateStaticParams() {
  return [...assets].map(file => ({ file }))
}
