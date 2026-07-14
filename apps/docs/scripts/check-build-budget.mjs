import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const BUILD_ROOT = new URL('../.next/', import.meta.url)
const ROUTES = ['/layout', '/docs/layout', '/docs/[[...slug]]/page']
const MAX_CLIENT_JAVASCRIPT_BYTES = 780_000

const manifest = JSON.parse(await readFile(new URL('app-build-manifest.json', BUILD_ROOT), 'utf8'))
const missing = ROUTES.filter(route => !Array.isArray(manifest.pages?.[route]))
if (missing.length > 0) throw new Error(`Documentation build manifest is missing routes: ${missing.join(', ')}`)

const chunks = [...new Set(ROUTES.flatMap(route => manifest.pages[route]))]
  .filter(file => file.endsWith('.js'))
const sizes = await Promise.all(chunks.map(async file => (await stat(join(BUILD_ROOT.pathname, file))).size))
const total = sizes.reduce((sum, size) => sum + size, 0)

if (total > MAX_CLIENT_JAVASCRIPT_BYTES) {
  throw new Error(`Documentation client JavaScript is ${total} bytes; budget is ${MAX_CLIENT_JAVASCRIPT_BYTES} bytes.`)
}

console.log(`Documentation client JavaScript budget passed: ${total}/${MAX_CLIENT_JAVASCRIPT_BYTES} bytes.`)
