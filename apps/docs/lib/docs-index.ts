import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(process.cwd(), '..', '..', 'docs')

export interface CanonicalDoc { readonly path: string; readonly title: string; readonly description: string; readonly body: string }

function frontmatterValue(body: string, key: 'title' | 'description'): string | undefined {
  const frontmatter = body.match(/^---\n([\s\S]*?)\n---/)?.[1]
  return frontmatter?.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()
}

export function publicDocSlug(path: string): string {
  return path
    .replace(/\.mdx?$/, '')
    .replace(/(^|\/)(?:README|index)$/, '')
}

export async function collectCanonicalDocs(): Promise<readonly CanonicalDoc[]> {
  const documents: CanonicalDoc[] = []
  const walk = async (directory: string, prefix: string[]): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(directory, entry.name)
      if (entry.isDirectory()) await walk(full, [...prefix, entry.name])
      else if (/\.mdx?$/.test(entry.name)) {
        const body = await readFile(full, 'utf8')
        const title = frontmatterValue(body, 'title')
          ?? body.match(/^#\s+(.+)$/m)?.[1]?.trim()
          ?? entry.name.replace(/\.mdx?$/, '')
        const description = frontmatterValue(body, 'description')
          ?? body.replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n').find(line => line.trim() && !line.startsWith('#'))?.trim().slice(0, 180)
          ?? ''
        documents.push({ path: [...prefix, entry.name].join('/'), title, description, body })
      }
    }
  }
  await walk(root, [])
  return documents.sort((left, right) => left.path.localeCompare(right.path))
}
