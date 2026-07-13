import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'

const IdentifierSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)
const FileSchema = z.string().min(1).refine(value => !value.startsWith('/') && !value.includes('..'), 'Evidence must be a repository-relative path.')
const RequirementSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  scope: z.enum(['universal', 'dom', 'native-mobile', 'terminal']),
  remediation: z.string().min(1),
}).strict()
const EvidenceSchema = z.object({ requirement: IdentifierSchema, files: z.array(FileSchema).min(1) }).strict()
const RendererSchema = z.object({
  id: z.enum(['react', 'react-native', 'vue', 'svelte', 'solid', 'angular', 'ink']),
  platform: z.enum(['dom', 'native-mobile', 'terminal']),
  supportFile: FileSchema,
  evidence: z.array(EvidenceSchema),
}).strict()
export const ConformanceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  requirements: z.array(RequirementSchema).min(1),
  renderers: z.array(RendererSchema).min(1),
  exceptions: z.array(z.object({
    renderer: RendererSchema.shape.id,
    requirement: IdentifierSchema,
    reason: z.string().min(1),
    owner: z.string().min(1),
    expires: z.iso.date(),
  }).strict()),
}).strict()

export const CatalogSupportSchema = z.object({
  components: z.record(IdentifierSchema, z.array(IdentifierSchema)),
}).strict()

const finding = (code, remediation, details = {}) => ({ code, remediation, ...details })

export const evaluateConformance = async ({ manifest: input, catalog, loadJson, fileExists, today = new Date().toISOString().slice(0, 10) }) => {
  const parsed = ConformanceManifestSchema.safeParse(input)
  if (!parsed.success) return [finding('AKC_MANIFEST_INVALID', 'Validate conformance/manifest.json against schema version 1.')]
  const manifest = parsed.data
  const findings = []
  const requirementIds = new Set(manifest.requirements.map(item => item.id))
  const requiredRenderers = ['react', 'react-native', 'vue', 'svelte', 'solid', 'angular', 'ink']
  const expectedPlatforms = { react: 'dom', 'react-native': 'native-mobile', vue: 'dom', svelte: 'dom', solid: 'dom', angular: 'dom', ink: 'terminal' }
  const rendererIds = manifest.renderers.map(item => item.id)
  for (const renderer of requiredRenderers) if (!rendererIds.includes(renderer)) findings.push(finding('AKC_RENDERER_MISSING', 'Declare the renderer and its evidence in conformance/manifest.json.', { renderer }))
  for (const renderer of new Set(rendererIds)) if (rendererIds.filter(item => item === renderer).length > 1) findings.push(finding('AKC_RENDERER_DUPLICATE', 'Keep exactly one manifest entry per renderer.', { renderer }))
  for (const requirement of manifest.requirements) if (manifest.requirements.filter(item => item.id === requirement.id).length > 1) findings.push(finding('AKC_REQUIREMENT_DUPLICATE', 'Keep requirement identifiers unique.', { requirement: requirement.id }))

  const expectedComponents = new Map(catalog.map(component => [component.key, component.events.map(event => event.name)]))
  for (const renderer of manifest.renderers) {
    if (renderer.platform !== expectedPlatforms[renderer.id]) findings.push(finding('AKC_PLATFORM_INVALID', `Use the native ${expectedPlatforms[renderer.id]} requirement set for this renderer.`, { renderer: renderer.id }))
    let support
    try { support = CatalogSupportSchema.parse(await loadJson(renderer.supportFile)) } catch {
      findings.push(finding('AKC_SUPPORT_INVALID', 'Declare a component-to-events object in the renderer catalog-support.json.', { renderer: renderer.id }))
      continue
    }
    for (const [component, events] of expectedComponents) {
      const supportedEvents = support.components[component]
      if (supportedEvents === undefined) {
        findings.push(finding('AKC_COMPONENT_MISSING', 'Implement the standard component or declare a time-bounded exception.', { renderer: renderer.id, component }))
        continue
      }
      for (const event of events) if (!supportedEvents.includes(event)) findings.push(finding('AKC_EVENT_MISSING', 'Implement and test the standard component event or declare a time-bounded exception.', { renderer: renderer.id, component, event }))
      for (const event of supportedEvents) if (!events.includes(event)) findings.push(finding('AKC_EVENT_UNKNOWN', 'Remove the stale event declaration or add the event to the standard catalog.', { renderer: renderer.id, component, event }))
      for (const event of new Set(supportedEvents)) if (supportedEvents.filter(item => item === event).length > 1) findings.push(finding('AKC_EVENT_DUPLICATE', 'Declare each component event once.', { renderer: renderer.id, component, event }))
    }
    for (const component of Object.keys(support.components)) if (!expectedComponents.has(component)) findings.push(finding('AKC_COMPONENT_UNKNOWN', 'Remove the stale support declaration or add the component to the standard catalog.', { renderer: renderer.id, component }))

    const required = manifest.requirements.filter(item => item.scope === 'universal' || item.scope === renderer.platform)
    for (const requirement of required) {
      const evidence = renderer.evidence.find(item => item.requirement === requirement.id)
      const exception = manifest.exceptions.find(item => item.renderer === renderer.id && item.requirement === requirement.id)
      if (exception !== undefined && exception.expires < today) findings.push(finding('AKC_EXCEPTION_EXPIRED', 'Resolve or renew the exception with an owner and future expiry.', { renderer: renderer.id, requirement: requirement.id }))
      if (evidence === undefined && exception === undefined) findings.push(finding('AKC_REQUIREMENT_MISSING', requirement.remediation, { renderer: renderer.id, requirement: requirement.id }))
      for (const file of evidence?.files ?? []) if (!(await fileExists(file))) findings.push(finding('AKC_EVIDENCE_MISSING', `Restore executable evidence at ${file} or update the manifest.`, { renderer: renderer.id, requirement: requirement.id }))
    }
    for (const evidence of renderer.evidence) if (!requirementIds.has(evidence.requirement)) findings.push(finding('AKC_REQUIREMENT_UNKNOWN', 'Remove stale evidence or define the requirement.', { renderer: renderer.id, requirement: evidence.requirement }))
  }
  for (const exception of manifest.exceptions) if (!requirementIds.has(exception.requirement)) findings.push(finding('AKC_EXCEPTION_UNKNOWN', 'Remove the stale exception or define its requirement.', { renderer: exception.renderer, requirement: exception.requirement }))
  return findings
}

export const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'))
export const repositoryFileExists = async path => access(resolve(path)).then(() => true, () => false)

export const formatFinding = item => {
  const context = ['renderer', 'component', 'event', 'requirement'].flatMap(key => item[key] === undefined ? [] : [`${key}=${item[key]}`]).join(' ')
  return `[${item.code}]${context === '' ? '' : ` ${context}`} — ${item.remediation}`
}
