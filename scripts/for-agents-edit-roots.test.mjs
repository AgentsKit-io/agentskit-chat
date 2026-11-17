import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = JSON.parse(readFileSync('doc-bridge.config.json', 'utf8'))
const ownership = Object.entries(config.routing.options.ownership)

describe('docs/for-agents edit-root coverage', () => {
  it.each(ownership)('%s agent doc names its edit root', (_id, owner) => {
    expect(readFileSync(owner.agentDoc, 'utf8')).toContain(owner.path)
  })
})
