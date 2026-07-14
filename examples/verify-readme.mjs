import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeReadmeClaims } from '../scripts/compute-readme-claims.mjs'
import { verifyReadmeClaims } from '../scripts/lib/readme-claims.mjs'

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const claims = JSON.parse(readFileSync(join(root, 'ecosystem-claims.json'), 'utf8'))
const computed = computeReadmeClaims()
const readme = readFileSync(join(root, 'README.md'), 'utf8')

verifyReadmeClaims(claims, computed, readme)

console.log(
  `Verified AgentsKit Chat README claims: ${computed.publicPackages} packages, ${computed.rendererPackages} renderers, ${computed.standardComponents} components, ${computed.conformanceRequirements} conformance requirements.`,
)
