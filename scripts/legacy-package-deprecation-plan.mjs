#!/usr/bin/env node
import { resolve } from 'node:path'
import { inspectLegacyDeprecationPlan } from './legacy-package-deprecation-lib.mjs'

const rootArgument = process.argv.find(argument => !argument.startsWith('--') && argument !== process.argv[0] && argument !== process.argv[1])
const root = resolve(rootArgument ?? '.')
const result = await inspectLegacyDeprecationPlan(root)
const report = {
  schemaVersion: result.plan.schemaVersion,
  ready: result.ready,
  blockers: result.blockers,
  migrationUrl: result.plan.migrationUrl,
  commands: result.commands,
  procedure: result.procedure,
  operations: result.operations,
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`legacy package deprecation dry-run: ${result.ready ? 'READY FOR HITL' : 'BLOCKED'}`)
  for (const blocker of result.blockers) console.log(`- blocker: ${blocker}`)
  console.log('\nStop and recovery procedure:')
  for (const step of result.procedure) console.log(`- ${step}`)
  console.log('\nPlanned operations (not executed):')
  for (const operation of result.operations) {
    console.log(`\n${operation.package}`)
    console.log(`  apply:    ${operation.apply}`)
    console.log(`  verify:   ${operation.verify}`)
    console.log(`  rollback: ${operation.rollback}`)
  }
}

if (process.argv.includes('--require-ready') && !result.ready) process.exitCode = 1
