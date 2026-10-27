import { readFileSync, writeFileSync } from 'node:fs'
import { computeReadmeSourceHash, parseReadmeStandard } from '../scripts/lib/readme-standard.mjs'

const root = process.cwd()
const configPath = 'readme-standard-v1.json'
const config = parseReadmeStandard(JSON.parse(readFileSync(configPath, 'utf8')))
for (const surface of config.surfaces) {
  const next = computeReadmeSourceHash(root, surface.freshness.sources)
  if (next !== surface.freshness.sourceHash) {
    console.log('updating', surface.id)
    surface.freshness.sourceHash = next
  }
}
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
