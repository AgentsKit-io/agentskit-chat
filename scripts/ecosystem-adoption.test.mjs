import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseEcosystemAdoption, summarizeEcosystemAdoption } from './ecosystem-adoption-lib.mjs'

const manifest = JSON.parse(readFileSync(new URL('../ecosystem-adoption.json', import.meta.url), 'utf8'))
const clone = value => structuredClone(value)

describe('ecosystem adoption contract', () => {
  it('accepts the audited baseline without claiming full convergence', () => {
    const parsed = parseEcosystemAdoption(manifest)
    expect(summarizeEcosystemAdoption(parsed)).toEqual({
      consumers: 8,
      productChats: 6,
      certifiedProductChats: 3,
      legacyConsumers: 2,
      pendingConsumers: 4,
    })
  })

  it('rejects duplicate and unknown consumers', () => {
    const duplicate = clone(manifest)
    duplicate.consumers[1].id = duplicate.consumers[0].id
    expect(() => parseEcosystemAdoption(duplicate)).toThrow('duplicate consumer id')

    const unknown = clone(manifest)
    unknown.consumers[0].id = 'unregistered-host'
    expect(() => parseEcosystemAdoption(unknown)).toThrow('unknown consumer')
  })

  it('rejects unknown repositories and version ranges', () => {
    const repository = clone(manifest)
    repository.consumers[0].repository = 'example/unknown'
    expect(() => parseEcosystemAdoption(repository)).toThrow()

    const range = clone(manifest)
    range.consumers[0].packageVersion = '^0.3.0'
    expect(() => parseEcosystemAdoption(range)).toThrow('exact stable version')
  })

  it('rejects certification with legacy packages or incomplete evidence', () => {
    const missingImports = clone(manifest)
    missingImports.consumers[0].imports = []
    expect(() => parseEcosystemAdoption(missingImports)).toThrow('must declare at least one consolidated package import')

    const legacy = clone(manifest)
    legacy.consumers[0].legacyPackages = ['@agentskit/chat-react']
    expect(() => parseEcosystemAdoption(legacy)).toThrow('cannot retain legacy packages')

    const production = clone(manifest)
    production.consumers[0].evidence.production = { status: 'missing' }
    expect(() => parseEcosystemAdoption(production)).toThrow('require passing production evidence')
  })

  it('keeps private evidence bounded to an aggregate attestation', () => {
    const privateLeak = clone(manifest)
    privateLeak.consumers.at(-1).evidence.url = 'https://example.com/private-details'
    expect(() => parseEcosystemAdoption(privateLeak)).toThrow()

    const falseCertification = clone(manifest)
    falseCertification.consumers.at(-1).status = 'certified'
    expect(() => parseEcosystemAdoption(falseCertification)).toThrow('certified consumers must use the exact framework version')
  })

  it('allows direct bindings only as excluded low-level examples', () => {
    const product = clone(manifest)
    const example = product.consumers.find(consumer => consumer.id === 'agentskit-binding-examples')
    example.classification = 'product-chat'
    expect(() => parseEcosystemAdoption(product)).toThrow('only low-level binding examples may be excluded')

    const adopted = clone(manifest)
    adopted.consumers.at(-1).packageVersion = '0.3.0'
    expect(() => parseEcosystemAdoption(adopted)).toThrow('not-adopted consumers cannot claim a package version')
  })
})
