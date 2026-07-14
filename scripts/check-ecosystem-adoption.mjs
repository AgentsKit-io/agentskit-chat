#!/usr/bin/env node
import { resolve } from 'node:path'
import { assertEcosystemAdoption } from './ecosystem-adoption-lib.mjs'

const root = resolve(process.argv[2] ?? '.')
const { manifest, summary } = await assertEcosystemAdoption(root)
const result = { schemaVersion: manifest.schemaVersion, frameworkVersion: manifest.frameworkVersion, ...summary }

if (process.argv.includes('--json')) console.log(JSON.stringify(result))
else console.log(`ecosystem adoption valid: ${summary.certifiedProductChats}/${summary.productChats} product chats certified; ${summary.pendingConsumers} consumers pending`)
