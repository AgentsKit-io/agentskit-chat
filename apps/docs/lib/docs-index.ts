import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { splitFrontmatter, splitLines } from '@agentskit/cross-platform/pure'
import { isPublicDocPath } from './public-docs'
import { readFrontmatterValue } from './frontmatter'

const root = join(process.cwd(), '..', '..', 'docs')

export interface CanonicalDoc { readonly path: string; readonly title: string; readonly description: string; readonly body: string }

export function publicDocSlug(path: string): string {
  return path
    .replace(/\.mdx?$/, '')
    .replace(/(^|\/)(?:README|index)$/, '')
}

/** Public doc sources by path: docs/ on disk, else the build-time index (Workers have no filesystem). */
export async function readPublicDocSources(): Promise<Readonly<Record<string, string>>> {
  try {
    const files: Record<string, string> = {}
    const walk = async (directory: string, prefix: string[]): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue
        const full = join(directory, entry.name)
        if (entry.isDirectory()) await walk(full, [...prefix, entry.name])
        else if (/\.mdx?$/.test(entry.name)) {
          const path = [...prefix, entry.name].join('/')
          if (isPublicDocPath(path)) files[path] = await readFile(full, 'utf8')
        }
      }
    }
    await walk(root, [])
    return files
  } catch {
    const { default: files } = await import('@/lib/docs-index.generated.json')
    return Object.fromEntries(Object.entries(files).filter(([path]) => isPublicDocPath(path)))
  }
}

/** Public product docs only — never ships private maintainer trees (architecture, PRD, ADRs, …). */
export async function collectCanonicalDocs(): Promise<readonly CanonicalDoc[]> {
  const documents: CanonicalDoc[] = []
  for (const [path, body] of Object.entries(await readPublicDocSources())) {
    const name = path.split('/').at(-1) ?? path
    const title = readFrontmatterValue(body, 'title')
      ?? body.match(/^#\s+(.+)$/m)?.[1]?.trim()
      ?? name.replace(/\.mdx?$/, '')
    const description = readFrontmatterValue(body, 'description')
      ?? splitLines(splitFrontmatter(body).body).find(line => line.trim() && !line.startsWith('#'))?.trim().slice(0, 180)
      ?? ''
    documents.push({ path, title, description, body })
  }
  return documents.sort((left, right) => left.path.localeCompare(right.path))
}
