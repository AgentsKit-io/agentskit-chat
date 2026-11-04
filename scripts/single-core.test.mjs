import { describe, expect, it } from 'vitest'
import { assertSingleCore, coreVersionsInLockfile } from './single-core-lib.mjs'

const lock = (...versions) =>
  `lockfileVersion: '9.0'\n\npackages:\n\n${versions.map(v => `  '@agentskit/core@${v}':\n    resolution: {integrity: x}\n`).join('\n')}\n  '@agentskit/core-extra@9.9.9':\n    resolution: {integrity: y}\n`

describe('RF-01 single @agentskit/core', () => {
  it('accepts one copy and ignores similarly named packages', () => {
    expect(assertSingleCore(lock('1.15.0'))).toBe('1.15.0')
  })
  it('rejects two copies', () => {
    expect(coreVersionsInLockfile(lock('1.12.3', '1.15.0'))).toEqual(['1.12.3', '1.15.0'])
    expect(() => assertSingleCore(lock('1.12.3', '1.15.0'))).toThrow(/2 copies/)
  })
  it('rejects a lockfile without core', () => {
    expect(() => assertSingleCore('packages:\n')).toThrow(/at all/)
  })
})
