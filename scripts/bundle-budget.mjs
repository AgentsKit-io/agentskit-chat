#!/usr/bin/env node
/**
 * Fail if published package ESM entrypoints exceed conservative size budgets.
 * Budgets are measured on the primary ESM build artifact after `pnpm build`.
 */
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** @type {ReadonlyArray<{ name: string; directory: string; entry: string; maxBytes: number }>} */
export const entryBudgets = [
  { name: '@agentskit/chat-protocol', directory: 'protocol', entry: 'dist/index.js', maxBytes: 120_000 },
  { name: '@agentskit/chat', directory: 'chat', entry: 'dist/index.js', maxBytes: 180_000 },
  { name: '@agentskit/chat-server', directory: 'server', entry: 'dist/index.js', maxBytes: 40_000 },
  { name: '@agentskit/chat-react', directory: 'react', entry: 'dist/index.js', maxBytes: 80_000 },
  { name: '@agentskit/chat-react-native', directory: 'react-native', entry: 'dist/index.js', maxBytes: 80_000 },
  { name: '@agentskit/chat-ink', directory: 'ink', entry: 'dist/index.js', maxBytes: 80_000 },
  { name: '@agentskit/chat-vue', directory: 'vue', entry: 'dist/index.js', maxBytes: 80_000 },
  { name: '@agentskit/chat-solid', directory: 'solid', entry: 'dist/index.js', maxBytes: 80_000 },
  { name: '@agentskit/chat-devtools', directory: 'devtools', entry: 'dist/index.js', maxBytes: 40_000 },
  { name: '@agentskit/chat-cli', directory: 'cli', entry: 'dist/index.js', maxBytes: 80_000 },
]

/**
 * @param {string} directory
 * @returns {Promise<number>}
 */
const directoryBytes = async directory => {
  let total = 0
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) total += await directoryBytes(path)
    else if (entry.isFile()) total += (await stat(path)).size
  }
  return total
}

/**
 * @param {{
 *   root: string
 *   budgets?: ReadonlyArray<{ name: string; directory: string; entry: string; maxBytes: number }>
 *   includeSpecialFormats?: boolean
 * }} options
 */
export const measureBundleBudgets = async ({ root, budgets = entryBudgets, includeSpecialFormats = true }) => {
  const failures = []
  /** @type {Array<{ name: string; size: number; maxBytes: number; ok: boolean }>} */
  const rows = []

  for (const budget of budgets) {
    const file = join(root, 'packages', budget.directory, budget.entry)
    try {
      const size = (await stat(file)).size
      rows.push({ name: budget.name, size, maxBytes: budget.maxBytes, ok: size <= budget.maxBytes })
      if (size > budget.maxBytes) failures.push(`${budget.name}: ${size} bytes exceeds budget ${budget.maxBytes} (${budget.entry})`)
    } catch (error) {
      failures.push(`${budget.name}: missing build artifact ${budget.entry} (${error instanceof Error ? error.message : error})`)
    }
  }

  if (includeSpecialFormats) {
    const svelteDist = join(root, 'packages', 'svelte', 'dist')
    try {
      const total = await directoryBytes(svelteDist)
      const maxBytes = 120_000
      rows.push({ name: '@agentskit/chat-svelte', size: total, maxBytes, ok: total <= maxBytes })
      if (total > maxBytes) failures.push(`@agentskit/chat-svelte: ${total} bytes exceeds budget ${maxBytes} (dist/**)`)
    } catch (error) {
      failures.push(`@agentskit/chat-svelte: missing dist (${error instanceof Error ? error.message : error})`)
    }

    const angularEntry = join(root, 'packages', 'angular', 'dist', 'fesm2022', 'agentskit-chat-angular.mjs')
    try {
      const size = (await stat(angularEntry)).size
      const maxBytes = 100_000
      rows.push({ name: '@agentskit/chat-angular', size, maxBytes, ok: size <= maxBytes })
      if (size > maxBytes) failures.push(`@agentskit/chat-angular: ${size} bytes exceeds budget ${maxBytes}`)
    } catch (error) {
      failures.push(`@agentskit/chat-angular: missing FESM artifact (${error instanceof Error ? error.message : error})`)
    }
  }

  return { failures, rows }
}

/**
 * @param {string} root
 * @param {{
 *   budgets?: ReadonlyArray<{ name: string; directory: string; entry: string; maxBytes: number }>
 *   includeSpecialFormats?: boolean
 * }} measureOptions
 */
export const runBundleBudgetCli = async (root = resolve('.'), measureOptions = {}) => {
  const { failures, rows } = await measureBundleBudgets({ root, ...measureOptions })
  for (const row of rows) {
    const status = row.ok ? 'ok' : 'FAIL'
    console.log(`${status.padEnd(4)} ${row.name.padEnd(32)} ${String(row.size).padStart(8)} / ${row.maxBytes}`)
  }
  if (failures.length > 0) {
    console.error('\nbundle budget failed:')
    for (const failure of failures) console.error(`  - ${failure}`)
    return 1
  }
  console.log(`\nbundle budget passed for ${rows.length} packages`)
  return 0
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await runBundleBudgetCli(resolve(process.argv[2] ?? '.'))
}
