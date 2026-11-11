import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureNodePty } from './ensure-node-pty-helper.mjs'

const dirs = []
const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'pty-'))
  dirs.push(root)
  mkdirSync(join(root, 'node_modules', 'node-pty'), { recursive: true })
  return root
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('ensureNodePty', () => {
  it('rebuilds when the compiled module is missing', () => {
    const root = makeRoot()
    const rebuild = vi.fn(() => {
      mkdirSync(join(root, 'node_modules', 'node-pty', 'build', 'Release'), { recursive: true })
      writeFileSync(join(root, 'node_modules', 'node-pty', 'build', 'Release', 'pty.node'), '')
    })
    expect(ensureNodePty(root, rebuild)).toBe('rebuilt')
    expect(rebuild).toHaveBeenCalledOnce()
  })

  it('does not rebuild when the module is present', () => {
    const root = makeRoot()
    mkdirSync(join(root, 'node_modules', 'node-pty', 'build', 'Release'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'node-pty', 'build', 'Release', 'pty.node'), '')
    const rebuild = vi.fn()
    expect(ensureNodePty(root, rebuild)).toBe('ready')
    expect(rebuild).not.toHaveBeenCalled()
  })

  it('reports missing when the rebuild does not help', () => {
    expect(ensureNodePty(makeRoot(), () => {})).toBe('missing')
  })
})
