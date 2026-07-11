import { invalidTurnEventFixtures, validTurnEventFixtures } from '../packages/protocol/src/fixtures.js'
import { decodeTurnEvent, encodeTurnEvent } from '../packages/protocol/src/index.js'
import { describe, expect, it } from 'vitest'

export const testTurnProtocolConformance = (renderer: string): void => {
  describe(`${renderer} turn protocol conformance`, () => {
    it.each(validTurnEventFixtures)('accepts shared $name fixture', ({ event }) => {
      expect(decodeTurnEvent(encodeTurnEvent(event))).toEqual({ ok: true, event })
    })

    it.each(invalidTurnEventFixtures)('rejects shared $name fixture inertly', ({ event, code }) => {
      const decoded = decodeTurnEvent(event)
      expect(decoded.ok).toBe(false)
      if (!decoded.ok) expect(decoded.diagnostic.code).toBe(code)
    })
  })
}
