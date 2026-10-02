// Bundles the PUBLIC docs (isPublicDocPath) into lib/docs-index.generated.json so llms.txt,
// llms-full.txt and /raw/<path> can answer without a filesystem (Cloudflare Workers via
// OpenNext). On Vercel the routes still read docs/ directly; this index is the fallback.
// Run with: node --experimental-strip-types scripts/build-docs-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { relativePosix } from '@agentskit/cross-platform'
import { isPublicDocPath } from '../lib/public-docs.ts'

const root = fileURLToPath(new URL('../../../docs', import.meta.url))
const out = fileURLToPath(new URL('../lib/docs-index.generated.json', import.meta.url))
const files = {}
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      const path = relativePosix(root, full)
      if (isPublicDocPath(path)) files[path] = readFileSync(full, 'utf8')
    }
  }
}
walk(root)
writeFileSync(out, JSON.stringify(files))
console.log(`docs index: ${Object.keys(files).length} public files -> lib/docs-index.generated.json`)
