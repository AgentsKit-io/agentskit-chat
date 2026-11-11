import { chmodSync, existsSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
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

// A file that exists is not enough: a binary from another ABI or a partial build fails at dlopen,
// which is what the pty tests hit. Load the module the same way node-pty does.
export function canLoadNodePty(ptyRoot) {
  try {
    createRequire(join(ptyRoot, 'lib', 'index.js'))('./utils.js').loadNativeModule('pty')
    return true
  } catch (error) {
    console.warn(`node-pty native module does not load: ${error instanceof Error ? error.message : error}`)
    return false
  }
}

export function ensureNodePty(root, rebuild = defaultRebuild, canLoad = canLoadNodePty) {
  const link = join(root, 'node_modules', 'node-pty')
  if (!existsSync(link)) return 'absent'
  // the tests load the module through the real pnpm store path, so check and build that directory
  const ptyRoot = realpathSync(link)
  const prebuildRoot = join(ptyRoot, 'prebuilds')
  if (existsSync(prebuildRoot)) {
    for (const platform of readdirSync(prebuildRoot)) {
      const helper = join(prebuildRoot, platform, 'spawn-helper')
      if (existsSync(helper)) chmodSync(helper, 0o755)
    }
  }
  if (hasNodePtyNative(ptyRoot)) {
    if (canLoad(ptyRoot)) return 'ready'
    rmSync(join(ptyRoot, 'build'), { recursive: true, force: true })
  }
  // pnpm can restore node-pty from its store without the compiled pty.node (a cache restored
  // without side effects skips the install script); the pty tests then fail on load.
  rebuild(root, ptyRoot)
  return hasNodePtyNative(ptyRoot) && canLoad(ptyRoot) ? 'rebuilt' : 'missing'
}

function defaultRebuild(root, ptyRoot) {
  spawnSync('pnpm', ['rebuild', 'node-pty'], { cwd: root, stdio: 'inherit' })
  if (hasNodePtyNative(ptyRoot) && canLoadNodePty(ptyRoot)) return
  // last resort: compile in the package directory itself (node-gyp comes from the packageExtensions entry)
  spawnSync('pnpm', ['exec', 'node-gyp', 'rebuild'], { cwd: ptyRoot, stdio: 'inherit' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = ensureNodePty(process.cwd())
  console.log(`node-pty native module: ${state}`)
  if (state === 'missing') {
    console.warn('node-pty native module is missing; pty tests will fail')
    if (process.argv.includes('--strict')) process.exitCode = 1
  }
}
