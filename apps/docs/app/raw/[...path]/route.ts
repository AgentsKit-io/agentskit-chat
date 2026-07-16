import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join, normalize, relative } from 'node:path'
import { isPublicDocPath } from '@/lib/public-docs'

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

  const relativePath = relative(root, file).replace(/\\/g, '/')
  if (!isPublicDocPath(relativePath)) return undefined
  return file
}

export async function GET(_request: Request, context: { readonly params: Promise<{ readonly path: string[] }> }) {
  const file = resolvePublicDoc((await context.params).path)
  if (!file) return new Response('Not found', { status: 404 })
  return new Response(await readFile(file, 'utf8'), {
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
