import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'vitest'

for (const workflow of ['ci', 'release']) {
  test(`${workflow} generates deterministic context before documentation checks`, () => {
    const source = readFileSync(new URL(`../.github/workflows/${workflow}.yml`, import.meta.url), 'utf8')
    const build = source.indexOf('name: Build deterministic repository index')
    const gate = source.indexOf('- run: pnpm docs:bridge:gate')
    assert.ok(build >= 0 && gate > build)
    assert.match(source.slice(build, gate), /pnpm docs:bridge:index[\s\S]*pnpm docs:bridge:index[\s\S]*cmp/u)
    assert.match(source.slice(build, gate), /index\.knowledge\.filter\(entry => !tracked\.has\(entry\.path\)\)/u)
    assert.ok(source.includes('- run: pnpm docs:bridge:conformance'))
    assert.ok(source.includes('- run: pnpm docs:bridge:doctor'))
    assert.ok(!source.includes('gate run index-freshness'))
  })
}

test('generated outputs are ignored while the memory inbox placeholder is retained', () => {
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8')
  for (const file of ['index.json', 'capabilities.json', 'llms.txt']) {
    assert.ok(ignore.includes(`/.doc-bridge/${file}`))
  }
  assert.ok(ignore.includes('!.doc-bridge/memory-inbox/.gitkeep'))
})
