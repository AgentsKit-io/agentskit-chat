import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { measureBundleBudgets, runBundleBudgetCli } from './bundle-budget.mjs'

const withArtifact = async (contents, callback) => {
  const root = await mkdtemp(join(tmpdir(), 'agentskit-chat-bundle-budget-'))
  const directory = join(root, 'packages', 'fixture', 'dist')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'index.js'), contents)
  try {
    await callback(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const fixtureBudget = [{ name: '@agentskit/chat-fixture', directory: 'fixture', entry: 'dist/index.js', maxBytes: 8 }]

test('accepts an artifact within its bundle budget', async () => {
  await withArtifact('export{}', async root => {
    const result = await measureBundleBudgets({ root, budgets: fixtureBudget, includeSpecialFormats: false })
    assert.deepEqual(result.failures, [])
    assert.equal(result.rows[0]?.ok, true)
  })
})

test('rejects an artifact above its bundle budget', async () => {
  await withArtifact('export const value = 1', async root => {
    const result = await measureBundleBudgets({ root, budgets: fixtureBudget, includeSpecialFormats: false })
    assert.equal(result.rows[0]?.ok, false)
    assert.match(result.failures[0] ?? '', /exceeds budget 8/)
  })
})

test('includes emitted ESM chunks in the package budget', async () => {
  await withArtifact('export{}', async root => {
    await writeFile(join(root, 'packages', 'fixture', 'dist', 'chunk-runtime.js'), 'x'.repeat(9))
    const result = await measureBundleBudgets({ root, budgets: fixtureBudget, includeSpecialFormats: false })
    assert.equal(result.rows[0]?.ok, false)
    assert.match(result.failures[0] ?? '', /exceeds budget 8/)
  })
})

test('excludes assembled subdirectories that have independent budgets', async () => {
  await withArtifact('export{}', async root => {
    const renderer = join(root, 'packages', 'fixture', 'dist', 'renderers', 'react')
    await mkdir(renderer, { recursive: true })
    await writeFile(join(renderer, 'index.js'), 'x'.repeat(9))
    const budgets = [{ ...fixtureBudget[0], excludedDirectories: ['renderers'] }]
    const result = await measureBundleBudgets({ root, budgets, includeSpecialFormats: false })
    assert.deepEqual(result.failures, [])
    assert.equal(result.rows[0]?.size, 8)
  })
})

test('rejects a missing build artifact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentskit-chat-bundle-budget-'))
  try {
    const result = await measureBundleBudgets({ root, budgets: fixtureBudget, includeSpecialFormats: false })
    assert.match(result.failures[0] ?? '', /missing build artifact/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('measures Svelte directories and the Angular FESM entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentskit-chat-bundle-budget-'))
  try {
    const svelte = join(root, 'packages', 'svelte', 'dist', 'nested')
    const angular = join(root, 'packages', 'angular', 'dist', 'fesm2022')
    await mkdir(svelte, { recursive: true })
    await mkdir(angular, { recursive: true })
    await writeFile(join(svelte, 'index.js'), 'export{}')
    await writeFile(join(angular, 'agentskit-chat-angular.mjs'), 'export{}')
    const result = await measureBundleBudgets({ root, budgets: [] })
    assert.deepEqual(result.failures, [])
    assert.deepEqual(result.rows.map(row => row.name), ['@agentskit/chat-svelte', '@agentskit/chat-angular'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('reports missing special-format artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentskit-chat-bundle-budget-'))
  try {
    const result = await measureBundleBudgets({ root, budgets: [] })
    assert.equal(result.failures.length, 2)
    assert.match(result.failures[0] ?? '', /chat-svelte: missing dist/)
    assert.match(result.failures[1] ?? '', /chat-angular: missing FESM artifact/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects oversized Svelte and Angular special-format artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agentskit-chat-bundle-budget-'))
  try {
    const svelte = join(root, 'packages', 'svelte', 'dist')
    const angular = join(root, 'packages', 'angular', 'dist', 'fesm2022')
    await mkdir(svelte, { recursive: true })
    await mkdir(angular, { recursive: true })
    await writeFile(join(svelte, 'index.js'), 'x'.repeat(120_001))
    await writeFile(join(angular, 'agentskit-chat-angular.mjs'), 'x'.repeat(100_001))
    const result = await measureBundleBudgets({ root, budgets: [] })
    assert.equal(result.rows.every(row => !row.ok), true)
    assert.equal(result.failures.length, 2)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('CLI returns success for an in-budget artifact', async () => {
  await withArtifact('export{}', async root => {
    assert.equal(await runBundleBudgetCli(root, { budgets: fixtureBudget, includeSpecialFormats: false }), 0)
  })
})

test('CLI returns failure for an over-budget artifact', async () => {
  await withArtifact('export const value = 1', async root => {
    assert.equal(await runBundleBudgetCli(root, { budgets: fixtureBudget, includeSpecialFormats: false }), 1)
  })
})
