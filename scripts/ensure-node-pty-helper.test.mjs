import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureNodePty, canLoadNodePty } from './ensure-node-pty-helper.mjs'

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
    expect(ensureNodePty(root, rebuild, () => true)).toBe('rebuilt')
    expect(rebuild).toHaveBeenCalledOnce()
  })

  it('does not rebuild when the module is present', () => {
    const root = makeRoot()
    mkdirSync(join(root, 'node_modules', 'node-pty', 'build', 'Release'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'node-pty', 'build', 'Release', 'pty.node'), '')
    const rebuild = vi.fn()
    expect(ensureNodePty(root, rebuild, () => true)).toBe('ready')
    expect(rebuild).not.toHaveBeenCalled()
  })

  it('reports missing when the rebuild does not help', () => {
    expect(ensureNodePty(makeRoot(), () => {}, () => true)).toBe('missing')
  })

  it('resolves the symlinked package to its real store directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'pty-'))
    dirs.push(root)
    const store = join(root, '.store', 'node-pty')
    mkdirSync(join(store, 'build', 'Release'), { recursive: true })
    mkdirSync(join(root, 'node_modules'), { recursive: true })
    symlinkSync(store, join(root, 'node_modules', 'node-pty'), 'dir')
    const rebuild = vi.fn((_root, ptyRoot) => {
      expect(ptyRoot).toBe(realpathSync(store))
      writeFileSync(join(ptyRoot, 'build', 'Release', 'pty.node'), '')
    })
    expect(ensureNodePty(root, rebuild, () => true)).toBe('rebuilt')
    expect(rebuild).toHaveBeenCalledOnce()
  })

  it('rebuilds a pty.node that exists but does not load', () => {
    const root = makeRoot()
    const dir = join(root, 'node_modules', 'node-pty')
    mkdirSync(join(dir, 'build', 'Release'), { recursive: true })
    writeFileSync(join(dir, 'build', 'Release', 'pty.node'), 'broken')
    let loadable = false
    const rebuild = vi.fn(() => {
      mkdirSync(join(dir, 'build', 'Release'), { recursive: true })
      writeFileSync(join(dir, 'build', 'Release', 'pty.node'), '')
      loadable = true
    })
    expect(ensureNodePty(root, rebuild, () => loadable)).toBe('rebuilt')
    expect(rebuild).toHaveBeenCalledOnce()
  })

  it('canLoadNodePty is false for an invalid binary', () => {
    const root = makeRoot()
    const dir = join(root, 'node_modules', 'node-pty')
    mkdirSync(join(dir, 'lib'), { recursive: true })
    mkdirSync(join(dir, 'build', 'Release'), { recursive: true })
    writeFileSync(
      join(dir, 'lib', 'utils.js'),
      "exports.loadNativeModule = (n) => ({ module: require('../build/Release/' + n + '.node') })",
    )
    writeFileSync(join(dir, 'build', 'Release', 'pty.node'), 'not a binary')
    expect(canLoadNodePty(dir)).toBe(false)
  })
})
