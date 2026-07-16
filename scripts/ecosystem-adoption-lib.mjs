import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const exactVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'must be an exact stable version')
const httpsUrlSchema = z.string().url().startsWith('https://')

const compareVersions = (left, right) => {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index]
    if (difference !== 0) return difference
  }
  return 0
}

const publicRepositories = [
  'AgentsKit-io/agentskit',
  'AgentsKit-io/agentskit-registry',
  'AgentsKit-io/agentskit-chat',
  'AgentsKit-io/agents-playbook',
  'AgentsKit-io/doc-bridge',
]

const repositorySchema = z.enum([...publicRepositories, 'private:akos'])
const supportedImportSchema = z.enum([
  '@agentskit/chat',
  '@agentskit/chat/protocol',
  '@agentskit/chat/protocol/fixtures',
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
export const legacyPackageNames = [
  '@agentskit/chat-protocol',
  '@agentskit/chat-server',
  '@agentskit/chat-devtools',
  '@agentskit/chat-react',
  '@agentskit/chat-react-native',
  '@agentskit/chat-ink',
  '@agentskit/chat-vue',
  '@agentskit/chat-svelte',
  '@agentskit/chat-solid',
  '@agentskit/chat-angular',
]
const legacyPackageSchema = z.enum(legacyPackageNames)

const publicCheckSchema = z.object({
  status: z.enum(['pass', 'pending', 'missing', 'not-applicable']),
  url: httpsUrlSchema.optional(),
}).strict().superRefine((check, context) => {
  if (check.status === 'pass' && check.url === undefined) {
    context.addIssue({ code: 'custom', message: 'passing public evidence requires an HTTPS URL' })
  }
  if ((check.status === 'missing' || check.status === 'not-applicable') && check.url !== undefined) {
    context.addIssue({ code: 'custom', message: `${check.status} evidence cannot declare a URL` })
  }
})

const publicEvidenceSchema = z.object({
  visibility: z.literal('public'),
  ci: publicCheckSchema,
  production: publicCheckSchema,
}).strict()

const privateEvidenceSchema = z.object({
  visibility: z.literal('private-attestation'),
  ciStatus: z.enum(['pass', 'pending']),
  productionStatus: z.enum(['pass', 'pending']),
  attestation: z.enum(['pending-chat-convergence-audit', 'chat-convergence-pass']),
}).strict()

const consumerSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  classification: z.enum(['product-chat', 'infrastructure-consumer', 'low-level-binding-example']),
  repository: repositorySchema,
  surface: z.enum(['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular', 'protocol', 'multi-surface']),
  consumption: z.enum(['npm', 'workspace', 'direct-binding', 'not-adopted']),
  packageVersion: exactVersionSchema.nullable(),
  imports: z.array(supportedImportSchema).max(12),
  legacyPackages: z.array(legacyPackageSchema).max(10),
  status: z.enum(['certified', 'migrating', 'deployment-required', 'inventory-required', 'excluded']),
  evidence: z.discriminatedUnion('visibility', [publicEvidenceSchema, privateEvidenceSchema]),
}).strict()

export const requiredConsumerIds = [
  'agentskit-docs',
  'agentskit-registry',
  'agentskit-chat-docs',
  'agents-playbook',
  'doc-bridge-docs',
  'registry-catalog',
  'agentskit-binding-examples',
  'akos-product-chats',
]

export const ecosystemAdoptionSchema = z.object({
  schemaVersion: z.literal(3),
  minimumConsolidatedVersion: exactVersionSchema,
  currentFrameworkVersion: exactVersionSchema,
  supportedConsolidatedVersions: z.array(exactVersionSchema).min(1),
  auditedAt: z.iso.date(),
  consumers: z.array(consumerSchema).length(requiredConsumerIds.length),
}).strict().superRefine((manifest, context) => {
  if (compareVersions(manifest.minimumConsolidatedVersion, manifest.currentFrameworkVersion) > 0) {
    context.addIssue({ code: 'custom', path: ['minimumConsolidatedVersion'], message: 'minimum consolidated version cannot exceed the current framework version' })
  }
  if (new Set(manifest.supportedConsolidatedVersions).size !== manifest.supportedConsolidatedVersions.length) {
    context.addIssue({ code: 'custom', path: ['supportedConsolidatedVersions'], message: 'supported consolidated versions must be unique' })
  }
  if (!manifest.supportedConsolidatedVersions.includes(manifest.minimumConsolidatedVersion)
    || !manifest.supportedConsolidatedVersions.includes(manifest.currentFrameworkVersion)) {
    context.addIssue({ code: 'custom', path: ['supportedConsolidatedVersions'], message: 'supported consolidated versions must include the minimum and current versions' })
  }
  for (const [index, version] of manifest.supportedConsolidatedVersions.entries()) {
    if (compareVersions(version, manifest.minimumConsolidatedVersion) < 0
      || compareVersions(version, manifest.currentFrameworkVersion) > 0) {
      context.addIssue({ code: 'custom', path: ['supportedConsolidatedVersions', index], message: 'supported consolidated versions must stay within the audited minimum and current boundaries' })
    }
    if (index > 0 && compareVersions(manifest.supportedConsolidatedVersions[index - 1], version) >= 0) {
      context.addIssue({ code: 'custom', path: ['supportedConsolidatedVersions', index], message: 'supported consolidated versions must be strictly increasing' })
    }
  }
  const seen = new Set()
  for (const [index, consumer] of manifest.consumers.entries()) {
    const path = ['consumers', index]
    if (seen.has(consumer.id)) {
      context.addIssue({ code: 'custom', path: [...path, 'id'], message: `duplicate consumer id: ${consumer.id}` })
    }
    seen.add(consumer.id)

    const isPrivate = consumer.repository === 'private:akos'
    if (isPrivate !== (consumer.evidence.visibility === 'private-attestation')) {
      context.addIssue({ code: 'custom', path: [...path, 'evidence'], message: 'private repositories require private attestations and public repositories require public evidence' })
    }
    if (consumer.consumption === 'workspace' && consumer.repository !== 'AgentsKit-io/agentskit-chat') {
      context.addIssue({ code: 'custom', path: [...path, 'consumption'], message: 'workspace consumption is allowed only for the framework-owned dogfood portal' })
    }
    if (consumer.consumption === 'not-adopted' && (consumer.packageVersion !== null || consumer.imports.length > 0)) {
      context.addIssue({ code: 'custom', path, message: 'not-adopted consumers cannot claim a package version or imports' })
    }

    if (consumer.classification === 'low-level-binding-example') {
      if (consumer.status !== 'excluded' || consumer.consumption !== 'direct-binding' || consumer.packageVersion !== null || consumer.legacyPackages.length > 0) {
        context.addIssue({ code: 'custom', path, message: 'low-level binding examples must be excluded, direct-binding, versionless, and free of legacy Chat packages' })
      }
      continue
    }

    if (consumer.status === 'excluded') {
      context.addIssue({ code: 'custom', path: [...path, 'status'], message: 'only low-level binding examples may be excluded' })
    }
    if (consumer.status === 'certified') {
      if (consumer.packageVersion === null
        || !manifest.supportedConsolidatedVersions.includes(consumer.packageVersion)) {
        context.addIssue({ code: 'custom', path: [...path, 'packageVersion'], message: 'certified consumers must use an exact supported consolidated framework version' })
      }
      if (!['npm', 'workspace'].includes(consumer.consumption)) {
        context.addIssue({ code: 'custom', path: [...path, 'consumption'], message: 'certified consumers must consume the consolidated package' })
      }
      if (consumer.imports.length === 0) {
        context.addIssue({ code: 'custom', path: [...path, 'imports'], message: 'certified consumers must declare at least one consolidated package import' })
      }
      if (consumer.legacyPackages.length > 0) {
        context.addIssue({ code: 'custom', path: [...path, 'legacyPackages'], message: 'certified consumers cannot retain legacy packages' })
      }
      if (consumer.evidence.visibility === 'public') {
        if (consumer.evidence.ci.status !== 'pass') {
          context.addIssue({ code: 'custom', path: [...path, 'evidence', 'ci'], message: 'certified public consumers require passing CI evidence' })
        }
        if (consumer.classification === 'product-chat' && consumer.evidence.production.status !== 'pass') {
          context.addIssue({ code: 'custom', path: [...path, 'evidence', 'production'], message: 'certified product chats require passing production evidence' })
        }
      } else if (consumer.evidence.ciStatus !== 'pass' || consumer.evidence.productionStatus !== 'pass' || consumer.evidence.attestation !== 'chat-convergence-pass') {
        context.addIssue({ code: 'custom', path: [...path, 'evidence'], message: 'certified private consumers require a complete Chat convergence attestation' })
      }
    }
  }

  for (const id of requiredConsumerIds) {
    if (!seen.has(id)) context.addIssue({ code: 'custom', path: ['consumers'], message: `missing required consumer: ${id}` })
  }
  for (const id of seen) {
    if (!requiredConsumerIds.includes(id)) context.addIssue({ code: 'custom', path: ['consumers'], message: `unknown consumer: ${id}` })
  }
})

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))

export const parseEcosystemAdoption = value => ecosystemAdoptionSchema.parse(value)

export const summarizeEcosystemAdoption = manifest => {
  const productChats = manifest.consumers.filter(consumer => consumer.classification === 'product-chat')
  return {
    consumers: manifest.consumers.length,
    productChats: productChats.length,
    certifiedProductChats: productChats.filter(consumer => consumer.status === 'certified').length,
    legacyConsumers: manifest.consumers.filter(consumer => consumer.legacyPackages.length > 0).length,
    pendingConsumers: manifest.consumers.filter(consumer => !['certified', 'excluded'].includes(consumer.status)).length,
  }
}

export const formatEcosystemAdoptionResult = manifest => ({
  schemaVersion: manifest.schemaVersion,
  minimumConsolidatedVersion: manifest.minimumConsolidatedVersion,
  currentFrameworkVersion: manifest.currentFrameworkVersion,
  supportedConsolidatedVersions: manifest.supportedConsolidatedVersions,
  ...summarizeEcosystemAdoption(manifest),
})

export const inspectEcosystemAdoption = async root => {
  const manifest = parseEcosystemAdoption(await readJson(join(root, 'ecosystem-adoption.json')))
  const workspace = await readJson(join(root, 'package.json'))
  const release = await readJson(join(root, 'release/manifest.json'))
  const diagnostics = []
  if (workspace.version !== release.version) diagnostics.push(`workspace version ${workspace.version} does not match release ${release.version}`)
  if (manifest.currentFrameworkVersion !== release.version) diagnostics.push(`current framework version ${manifest.currentFrameworkVersion} does not match release ${release.version}`)
  return { diagnostics, manifest, summary: summarizeEcosystemAdoption(manifest) }
}

export const assertEcosystemAdoption = async root => {
  const result = await inspectEcosystemAdoption(root)
  if (result.diagnostics.length > 0) throw new Error(`ecosystem adoption gate failed:\n${result.diagnostics.map(item => `- ${item}`).join('\n')}`)
  return result
}

export const ecosystemPublicRepositories = publicRepositories
