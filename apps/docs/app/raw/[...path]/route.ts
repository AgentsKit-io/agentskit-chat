import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join, normalize, relative } from 'node:path'

export const dynamic = 'force-static'
const root = join(process.cwd(), '..', '..', 'docs')

const resolveDoc = (segments: readonly string[]): string | undefined => {
  const cleaned = segments.map(segment => segment.replace(/\.mdx?$/i, ''))
  const base = normalize(join(root, ...cleaned))
  if (relative(root, base).startsWith('..')) return undefined
  return [`${base}.md`, `${base}.mdx`, join(base, 'README.md')].find(existsSync)
}

export async function GET(_request: Request, context: { readonly params: Promise<{ readonly path: string[] }> }) {
  const file = resolveDoc((await context.params).path)
  if (!file) return new Response('Not found', { status: 404 })
  return new Response(await readFile(file, 'utf8'), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600' } })
}

export async function generateStaticParams() {
  const paths: { path: string[] }[] = []
  const walk = async (directory: string, prefix: string[]): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) await walk(join(directory, entry.name), [...prefix, entry.name])
      else if (/\.mdx?$/.test(entry.name)) paths.push({ path: [...prefix, entry.name] })
    }
  }
  await walk(root, [])
  return paths
}
