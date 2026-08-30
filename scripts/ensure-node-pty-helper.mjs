import { chmodSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const prebuildRoot = join(process.cwd(), 'node_modules', 'node-pty', 'prebuilds')
if (existsSync(prebuildRoot)) {
  for (const platform of readdirSync(prebuildRoot)) {
    const helper = join(prebuildRoot, platform, 'spawn-helper')
    if (existsSync(helper)) chmodSync(helper, 0o755)
  }
}
