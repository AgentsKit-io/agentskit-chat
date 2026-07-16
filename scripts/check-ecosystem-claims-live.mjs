#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { verifyLiveEndpointClaims } from './ecosystem-claims-live-lib.mjs'

const contract = JSON.parse(await readFile(new URL('../ecosystem-contract-claims.json', import.meta.url), 'utf8'))
const result = await verifyLiveEndpointClaims({ contract })
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`ecosystem endpoint claims: ${result.ready ? 'CURRENT' : 'STALE'}`)
  console.log(`verified ${result.verified.length} endpoint-derived claim(s)`)
  for (const blocker of result.blockers) console.log(`- blocker: ${blocker}`)
}
if (!result.ready) process.exitCode = 1
