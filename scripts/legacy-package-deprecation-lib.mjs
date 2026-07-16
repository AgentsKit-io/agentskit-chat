import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { legacyPackageNames, parseEcosystemAdoption } from './ecosystem-adoption-lib.mjs'

const replacementSchema = z.enum([
  '@agentskit/chat/protocol',
  '@agentskit/chat/server',
  '@agentskit/chat/devtools',
  '@agentskit/chat/react',
  '@agentskit/chat/react-native',
  '@agentskit/chat/ink',
  '@agentskit/chat/vue',
  '@agentskit/chat/svelte',
  '@agentskit/chat/solid',
  '@agentskit/chat/angular',
])

export const legacyPackageReplacements = {
  '@agentskit/chat-protocol': '@agentskit/chat/protocol',
  '@agentskit/chat-server': '@agentskit/chat/server',
  '@agentskit/chat-devtools': '@agentskit/chat/devtools',
  '@agentskit/chat-react': '@agentskit/chat/react',
  '@agentskit/chat-react-native': '@agentskit/chat/react-native',
  '@agentskit/chat-ink': '@agentskit/chat/ink',
  '@agentskit/chat-vue': '@agentskit/chat/vue',
  '@agentskit/chat-svelte': '@agentskit/chat/svelte',
  '@agentskit/chat-solid': '@agentskit/chat/solid',
  '@agentskit/chat-angular': '@agentskit/chat/angular',
}

export const legacyDeprecationPlanSchema = z.object({
  schemaVersion: z.literal(1),
  migrationUrl: z.literal('https://chat.agentskit.io/docs/releases/migration-to-0.3'),
  packages: z.array(z.object({
    name: z.enum(legacyPackageNames),
    replacement: replacementSchema,
  }).strict()).length(legacyPackageNames.length),
}).strict().superRefine((plan, context) => {
  const names = plan.packages.map(entry => entry.name)
  const replacements = plan.packages.map(entry => entry.replacement)
  for (const name of legacyPackageNames) {
    if (!names.includes(name)) context.addIssue({ code: 'custom', path: ['packages'], message: `missing legacy package: ${name}` })
  }
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: 'custom', path: ['packages'], message: 'legacy package names must be unique' })
  }
  if (new Set(replacements).size !== replacements.length) {
    context.addIssue({ code: 'custom', path: ['packages'], message: 'replacement subpaths must be unique' })
  }
  for (const [index, entry] of plan.packages.entries()) {
    if (legacyPackageReplacements[entry.name] !== entry.replacement) {
      context.addIssue({ code: 'custom', path: ['packages', index, 'replacement'], message: `${entry.name} must point to ${legacyPackageReplacements[entry.name]}` })
    }
  }
})

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const quoteShell = value => `'${value.replaceAll("'", "'\\''")}'`

export const parseLegacyDeprecationPlan = value => legacyDeprecationPlanSchema.parse(value)

export const evaluateLegacyDeprecationReadiness = (manifest, plan) => {
  const blockers = []
  for (const consumer of manifest.consumers) {
    if (consumer.classification !== 'low-level-binding-example' && consumer.status !== 'certified') {
      blockers.push(`${consumer.id} is ${consumer.status}`)
    }
    if (consumer.legacyPackages.length > 0) {
      blockers.push(`${consumer.id} still declares ${consumer.legacyPackages.join(', ')}`)
    }
  }

  const commands = plan.packages.map(entry => {
    const message = `Use ${entry.replacement}. Migration: ${plan.migrationUrl}`
    return `npm deprecate ${quoteShell(`${entry.name}@*`)} ${quoteShell(message)}`
  })
  const operations = plan.packages.map((entry, index) => ({
    package: entry.name,
    apply: commands[index],
    verify: `npm view ${quoteShell(`${entry.name}@*`)} deprecated --json`,
    rollback: `npm deprecate ${quoteShell(`${entry.name}@*`)} ''`,
  }))

  return {
    ready: blockers.length === 0,
    blockers,
    commands,
    procedure: [
      'Re-read the package deprecation metadata before applying its approved command.',
      'Apply one command only, then re-read npm and attach the exact result to issue #103.',
      'Stop immediately on auth, ownership, registry, propagation, message, or replacement mismatch; do not continue to the next package.',
      'If an incorrect notice was applied, run that operation rollback command, verify the notice is cleared, and obtain new HITL approval before retrying.',
    ],
    operations,
  }
}

export const inspectLegacyDeprecationPlan = async root => {
  const manifest = parseEcosystemAdoption(await readJson(join(root, 'ecosystem-adoption.json')))
  const plan = parseLegacyDeprecationPlan(await readJson(join(root, 'release/legacy-package-deprecations.json')))
  return { manifest, plan, ...evaluateLegacyDeprecationReadiness(manifest, plan) }
}
