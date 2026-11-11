import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function hasNodePtyNative(ptyRoot) {
  if (existsSync(join(ptyRoot, 'build', 'Release', 'pty.node'))) return true
  if (existsSync(join(ptyRoot, 'build', 'Debug', 'pty.node'))) return true
  const prebuildRoot = join(ptyRoot, 'prebuilds')
  if (!existsSync(prebuildRoot)) return false
  const key = `${process.platform}-${process.arch}`
  return existsSync(join(prebuildRoot, key, 'pty.node'))
}

export function ensureNodePty(root, rebuild = defaultRebuild) {
  const ptyRoot = join(root, 'node_modules', 'node-pty')
  if (!existsSync(ptyRoot)) return 'absent'
  const prebuildRoot = join(ptyRoot, 'prebuilds')
  if (existsSync(prebuildRoot)) {
    for (const platform of readdirSync(prebuildRoot)) {
      const helper = join(prebuildRoot, platform, 'spawn-helper')
      if (existsSync(helper)) chmodSync(helper, 0o755)
    }
  }
  if (hasNodePtyNative(ptyRoot)) return 'ready'
  // pnpm can restore node-pty from its store without the compiled pty.node (a cache restored
  // without side effects skips the install script); the pty tests then fail on load.
  rebuild(root)
  return hasNodePtyNative(ptyRoot) ? 'rebuilt' : 'missing'
}

function defaultRebuild(root) {
  spawnSync('pnpm', ['rebuild', 'node-pty'], { cwd: root, stdio: 'inherit' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = ensureNodePty(process.cwd())
  if (state === 'missing') console.warn('node-pty native module is missing; pty tests will fail')
}
