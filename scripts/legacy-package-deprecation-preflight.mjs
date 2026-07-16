#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runLegacyDeprecationPreflight } from './legacy-package-deprecation-preflight-lib.mjs'

const rootArgument = process.argv.find(argument => !argument.startsWith('--') && argument !== process.argv[0] && argument !== process.argv[1])
const root = resolve(rootArgument ?? '.')
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'))
const result = await runLegacyDeprecationPreflight({
  adoption: await readJson('ecosystem-adoption.json'),
  plan: await readJson('release/legacy-package-deprecations.json'),
})

if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`legacy package live preflight: ${result.ready ? 'READY FOR HITL' : 'BLOCKED'}`)
  console.log(`checked ${result.checkedUrls.length} public evidence URLs and ${result.legacyPackages.length} legacy npm packages`)
  for (const blocker of result.blockers) console.log(`- blocker: ${blocker}`)
}
if (!result.ready) process.exitCode = 1
