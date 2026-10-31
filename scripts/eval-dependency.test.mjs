import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readManifest = (name) =>
  JSON.parse(readFileSync(new URL(`../packages/${name}/package.json`, import.meta.url), 'utf8'))

describe('@agentskit/eval dependency', () => {
  it.each(['chat', 'devtools'])('%s depends on @agentskit/eval ^0.7', (name) => {
    const manifest = readManifest(name)
    const range =
      manifest.dependencies?.['@agentskit/eval'] ?? manifest.peerDependencies?.['@agentskit/eval']
    expect(range).toMatch(/^\^0\.7(\.\d+)?$/)
  })
})
