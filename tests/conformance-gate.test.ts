import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { evaluateConformance } from '../scripts/conformance-lib.mjs'

const manifest = JSON.parse(await readFile(new URL('../conformance/manifest.json', import.meta.url), 'utf8'))
const catalog = [{ key: 'button-group', events: [{ name: 'select' }] }]
const completeSupport = { components: { 'button-group': ['select'] } }
const evaluate = (candidate: unknown, support = completeSupport, exists = true) => evaluateConformance({
  manifest: candidate,
  catalog,
  loadJson: async () => support,
  fileExists: async () => exists,
  today: '2026-07-13',
})

describe('conformance gate diagnostics', () => {
  it('fails closed for a malformed manifest', async () => {
    const findings = await evaluate({ schemaVersion: 2 })
    expect(findings).toEqual([expect.objectContaining({ code: 'AKC_MANIFEST_INVALID' })])
  })

  it('identifies an exact missing renderer', async () => {
    const broken = structuredClone(manifest)
    broken.renderers = broken.renderers.filter((item: { id: string }) => item.id !== 'vue')
    const findings = await evaluate(broken)
    expect(findings).toContainEqual(expect.objectContaining({ code: 'AKC_RENDERER_MISSING', renderer: 'vue' }))
  })

  it('identifies an exact missing component and event', async () => {
    const missingComponent = await evaluate(manifest, { components: {} })
    expect(missingComponent).toContainEqual(expect.objectContaining({ code: 'AKC_COMPONENT_MISSING', renderer: 'react', component: 'button-group' }))

    const missingEvent = await evaluate(manifest, { components: { 'button-group': [] } })
    expect(missingEvent).toContainEqual(expect.objectContaining({ code: 'AKC_EVENT_MISSING', renderer: 'react', component: 'button-group', event: 'select' }))
  })

  it('identifies the renderer and requirement for missing evidence', async () => {
    const findings = await evaluate(manifest, completeSupport, false)
    expect(findings).toContainEqual(expect.objectContaining({ code: 'AKC_EVIDENCE_MISSING', renderer: 'ink', requirement: 'terminal-keyboard' }))
  })

  it('rejects expired exceptions with stable remediation', async () => {
    const broken = structuredClone(manifest)
    broken.exceptions = [{ renderer: 'react', requirement: 'dom-keyboard', reason: 'Temporary upstream regression.', owner: '@maintainers', expires: '2026-07-12' }]
    const findings = await evaluate(broken)
    expect(findings).toContainEqual(expect.objectContaining({ code: 'AKC_EXCEPTION_EXPIRED', renderer: 'react', requirement: 'dom-keyboard' }))
  })
})
