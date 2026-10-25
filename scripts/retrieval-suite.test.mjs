import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const suite = JSON.parse(readFileSync(new URL('../docs/bench/retrieval-suite-v1.json', import.meta.url), 'utf8'))
const root = new URL('../', import.meta.url)

describe('retrieval benchmark suite', () => {
  it('keeps 20-40 uniquely named cases', () => {
    expect(suite.cases.length).toBeGreaterThanOrEqual(20)
    expect(suite.cases.length).toBeLessThanOrEqual(40)
    expect(new Set(suite.cases.map(item => item.id)).size).toBe(suite.cases.length)
  })

  it('includes Portuguese cases', () => {
    expect(suite.cases.filter(item => item.metadata.lang === 'pt').length).toBeGreaterThanOrEqual(3)
  })

  it('points every expected target at an existing repository file', () => {
    for (const item of suite.cases) {
      expect(item.metadata.expectedTargets.length).toBeGreaterThan(0)
      for (const target of item.metadata.expectedTargets) expect(existsSync(new URL(target, root)), `${item.id}: ${target}`).toBe(true)
    }
  })
})
