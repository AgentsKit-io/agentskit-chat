import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseEcosystemAdoption } from './ecosystem-adoption-lib.mjs'
import {
  evaluateLegacyDeprecationReadiness,
  parseLegacyDeprecationPlan,
} from './legacy-package-deprecation-lib.mjs'

const adoption = JSON.parse(readFileSync(new URL('../ecosystem-adoption.json', import.meta.url), 'utf8'))
const plan = JSON.parse(readFileSync(new URL('../release/legacy-package-deprecations.json', import.meta.url), 'utf8'))
const clone = value => structuredClone(value)
const certifiedAdoption = () => {
  const certified = clone(adoption)
  const akos = certified.consumers.find(consumer => consumer.id === 'akos-product-chats')
  akos.status = 'certified'
  akos.evidence = {
    visibility: 'private-attestation',
    ciStatus: 'pass',
    productionStatus: 'pass',
    attestation: 'chat-convergence-pass',
  }
  return certified
}

describe('legacy package deprecation dry-run', () => {
  it('enumerates every legacy package exactly once with a canonical replacement', () => {
    const parsed = parseLegacyDeprecationPlan(plan)
    expect(parsed.packages).toHaveLength(10)
    expect(new Set(parsed.packages.map(entry => entry.name)).size).toBe(10)
    expect(new Set(parsed.packages.map(entry => entry.replacement)).size).toBe(10)
  })

  it('fails closed while any active consumer is not certified', () => {
    const blocked = clone(adoption)
    const docs = blocked.consumers.find(consumer => consumer.id === 'agentskit-chat-docs')
    docs.status = 'deployment-required'
    docs.evidence.production = { status: 'missing' }
    const akos = blocked.consumers.find(consumer => consumer.id === 'akos-product-chats')
    akos.status = 'inventory-required'
    akos.consumption = 'not-adopted'
    akos.packageVersion = null
    akos.imports = []
    akos.evidence = {
      visibility: 'private-attestation',
      ciStatus: 'pending',
      productionStatus: 'pending',
      attestation: 'pending-chat-convergence-audit',
    }

    const result = evaluateLegacyDeprecationReadiness(parseEcosystemAdoption(blocked), parseLegacyDeprecationPlan(plan))
    expect(result.ready).toBe(false)
    expect(result.blockers).toEqual([
      'agentskit-chat-docs is deployment-required',
      'akos-product-chats is inventory-required',
    ])
    expect(result.commands).toHaveLength(10)
    expect(result.operations).toHaveLength(10)
    expect(result.procedure).toHaveLength(4)
  })

  it('becomes ready only after public and private evidence is certified', () => {
    const result = evaluateLegacyDeprecationReadiness(parseEcosystemAdoption(certifiedAdoption()), parseLegacyDeprecationPlan(plan))
    expect(result).toMatchObject({ ready: true, blockers: [] })
  })

  it('rejects incomplete, duplicate, and non-canonical plans', () => {
    const incomplete = clone(plan)
    incomplete.packages.pop()
    expect(() => parseLegacyDeprecationPlan(incomplete)).toThrow()

    const duplicate = clone(plan)
    duplicate.packages[1] = duplicate.packages[0]
    expect(() => parseLegacyDeprecationPlan(duplicate)).toThrow('legacy package names must be unique')

    const external = clone(plan)
    external.migrationUrl = 'https://example.com/migrate'
    expect(() => parseLegacyDeprecationPlan(external)).toThrow()

    const swapped = clone(plan)
    const replacement = swapped.packages[0].replacement
    swapped.packages[0].replacement = swapped.packages[1].replacement
    swapped.packages[1].replacement = replacement
    expect(() => parseLegacyDeprecationPlan(swapped)).toThrow('must point to')
  })

  it('renders quoted npm commands without providing an execution path', () => {
    const result = evaluateLegacyDeprecationReadiness(parseEcosystemAdoption(adoption), parseLegacyDeprecationPlan(plan))
    expect(result.commands[0]).toBe(
      "npm deprecate '@agentskit/chat-protocol@*' 'Use @agentskit/chat/protocol. Migration: https://chat.agentskit.io/docs/releases/migration-to-0.3'",
    )
    expect(result.operations[0]).toEqual({
      package: '@agentskit/chat-protocol',
      apply: result.commands[0],
      verify: "npm view '@agentskit/chat-protocol@*' deprecated --json",
      rollback: "npm deprecate '@agentskit/chat-protocol@*' ''",
    })
    expect(result.procedure.join(' ')).toContain('Stop immediately')
  })
})
