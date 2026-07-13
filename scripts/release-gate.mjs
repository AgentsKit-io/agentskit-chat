import { resolve } from 'node:path'
import { assertRelease } from './release-lib.mjs'

const root = resolve(process.argv[2] ?? '.')
const release = await assertRelease(root)
console.log(`release gate passed for ${release.version}: ${release.packages.length} packages, ${release.renderers.length} renderers`)
