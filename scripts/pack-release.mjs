import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { assertRelease } from './release-lib.mjs'

const root = resolve('.')
const artifactDir = resolve(process.argv[2] ?? 'artifacts')
const release = await assertRelease(root)

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`)
}

await rm(artifactDir, { recursive: true, force: true })
await mkdir(artifactDir, { recursive: true })

for (const item of release.packages) {
  run('pnpm', ['--filter', item.name, 'pack', '--pack-destination', artifactDir])
}

const checksums = []
for (const item of release.packages) {
  const file = `${item.name.slice(1).replace('/', '-')}-${release.version}.tgz`
  const hash = createHash('sha256').update(await readFile(join(artifactDir, file))).digest('hex')
  checksums.push({ file, line: `${hash}  ${file}` })
}
await writeFile(join(artifactDir, 'SHA256SUMS'), `${checksums.sort((left, right) => left.file.localeCompare(right.file)).map(item => item.line).join('\n')}\n`)

run('node', ['scripts/verify-release-artifacts.mjs', artifactDir, release.version])
