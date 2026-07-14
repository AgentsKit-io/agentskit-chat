import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(process.cwd(), '..', '..', 'docs')

export interface CanonicalDoc { readonly path: string; readonly title: string; readonly description: string; readonly body: string }

export async function collectCanonicalDocs(): Promise<readonly CanonicalDoc[]> {
  const documents: CanonicalDoc[] = []
  const walk = async (directory: string, prefix: string[]): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(directory, entry.name)
      if (entry.isDirectory()) await walk(full, [...prefix, entry.name])
      else if (/\.mdx?$/.test(entry.name)) {
        const body = await readFile(full, 'utf8')
        const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? entry.name.replace(/\.mdx?$/, '')
        const description = body.split('\n').find(line => line.trim() && !line.startsWith('#') && !line.startsWith('---'))?.trim().slice(0, 180) ?? ''
        documents.push({ path: [...prefix, entry.name].join('/'), title, description, body })
      }
    }
  }
  await walk(root, [])
  return documents.sort((left, right) => left.path.localeCompare(right.path))
}
