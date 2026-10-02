import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join, normalize, relative } from 'node:path'
import { toPosix } from '@agentskit/cross-platform/pure'
import { isPublicDocPath } from '@/lib/public-docs'
import { readPublicDocSources } from '@/lib/docs-index'

export const dynamic = 'force-static'
const root = join(process.cwd(), '..', '..', 'docs')

const resolvePublicDoc = (segments: readonly string[]): string | undefined => {
  const cleaned = segments.map(segment => segment.replace(/\.mdx?$/i, ''))
  const base = normalize(join(root, ...cleaned))
  const relBase = relative(root, base)
  if (relBase.startsWith('..') || relBase.includes('..')) return undefined

  const candidates = [`${base}.md`, `${base}.mdx`, join(base, 'README.md'), join(base, 'index.mdx')] as const
  const file = candidates.find(existsSync)
  if (!file) return undefined

  const relativePath = toPosix(relative(root, file))
  if (!isPublicDocPath(relativePath)) return undefined
  return file
}

// Workers (OpenNext) have no filesystem: the same candidates, looked up in the build-time index.
const resolveFromIndex = async (segments: readonly string[]): Promise<string | undefined> => {
  const base = segments.map(segment => segment.replace(/\.mdx?$/i, '')).join('/')
  if (base.split('/').includes('..')) return undefined
  const sources = await readPublicDocSources()
  const candidate = [`${base}.md`, `${base}.mdx`, `${base}/README.md`, `${base}/index.mdx`].find(path => path in sources)
  return candidate === undefined ? undefined : sources[candidate]
}

export async function GET(_request: Request, context: { readonly params: Promise<{ readonly path: string[] }> }) {
  const segments = (await context.params).path
  const file = resolvePublicDoc(segments)
  const body = file ? await readFile(file, 'utf8') : await resolveFromIndex(segments)
  if (body === undefined) return new Response('Not found', { status: 404 })
  return new Response(body, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  })
}

export async function generateStaticParams() {
  const paths: { path: string[] }[] = []
  const walk = async (directory: string, prefix: string[]): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) await walk(join(directory, entry.name), [...prefix, entry.name])
      else if (/\.mdx?$/.test(entry.name)) {
        const relativePath = [...prefix, entry.name].join('/')
        if (isPublicDocPath(relativePath)) paths.push({ path: [...prefix, entry.name] })
      }
    }
  }
  await walk(root, [])
  return paths
}
