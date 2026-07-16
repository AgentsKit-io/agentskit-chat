#!/usr/bin/env node
import { resolve } from 'node:path'
import { assertEcosystemAdoption, formatEcosystemAdoptionResult } from './ecosystem-adoption-lib.mjs'

const rootArgument = process.argv.slice(2).find(argument => !argument.startsWith('--'))
const root = resolve(rootArgument ?? '.')
const { manifest, summary } = await assertEcosystemAdoption(root)
const result = formatEcosystemAdoptionResult(manifest)

if (process.argv.includes('--json')) console.log(JSON.stringify(result))
else console.log(`ecosystem adoption valid: ${summary.certifiedProductChats}/${summary.productChats} product chats certified; ${summary.pendingConsumers} consumers pending`)
