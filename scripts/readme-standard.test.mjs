import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { REPO_ROOT } from './compute-readme-claims.mjs'
import { auditReadmeStandard } from './lib/readme-standard.mjs'

const config = JSON.parse(readFileSync(`${REPO_ROOT}/readme-standard-v1.json`, 'utf8'))
const auditDate = '2026-07-14'

describe('README Standard v1', () => {
  it('passes every declared surface, budget, example, and freshness gate', () => {
    const report = auditReadmeStandard(config, { root: REPO_ROOT, today: auditDate })
    expect(report.status).toBe('pass')
    expect(report.summary.failed).toBe(0)
  })

  it('runs the root verification command without network access', () => {
    const output = execFileSync(process.execPath, ['examples/verify-readme.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' })
    expect(output.trim()).toMatch(/^Verified AgentsKit Chat README claims:/)
  })

  it('runs the CLI renderer fixture', () => {
    const output = execFileSync(process.execPath, ['packages/cli/fixtures/readme-example.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' })
    expect(output.trim()).toBe('Supported renderers: react, react-native, ink, vue, svelte, solid, angular')
  })

  it('exposes stable JSON output from the CLI gate', () => {
    const env = { ...process.env, README_STANDARD_DATE: auditDate }
    const first = spawnSync(process.execPath, ['scripts/check-readme-standard.mjs', '--json'], { cwd: REPO_ROOT, env, encoding: 'utf8' })
    const second = spawnSync(process.execPath, ['scripts/check-readme-standard.mjs', '--json'], { cwd: REPO_ROOT, env, encoding: 'utf8' })
    expect(first.status).toBe(0, first.stderr)
    expect(first.stdout).toBe(second.stdout)
    expect(JSON.parse(first.stdout).summary.surfaces).toBe(13)
  })
})