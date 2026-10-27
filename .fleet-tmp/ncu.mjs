// Usage: node ncu.mjs <repoRoot> [--apply]
// Finds third-party direct deps and their newest in-major (0.x: in-minor) version.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2]
const apply = process.argv.includes('--apply')
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies']
const reject = /^@agentskit(-io)?\//

const files = [join(root, 'package.json')]
for (const dir of ['packages', 'apps']) {
  const base = join(root, dir)
  if (!existsSync(base)) continue
  for (const d of readdirSync(base)) {
    const p = join(base, d, 'package.json')
    if (existsSync(p)) files.push(p)
  }
}

const parse = v => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v)
  return m ? m.slice(1, 4).map(Number) : null
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

const cache = new Map()
async function meta(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`).then(r => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`)
      return r.json()
    }))
  }
  return cache.get(name)
}

const report = []
for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const pkg = JSON.parse(raw)
  let changed = false
  for (const section of SECTIONS) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      if (reject.test(name)) continue
      const m = /^([\^~]?)(\d+\.\d+\.\d+)$/.exec(spec)
      if (!m) { report.push({ file: file.slice(root.length + 1), section, name, spec, skip: 'unsupported spec' }); continue }
      const [, prefix, ver] = m
      const cur = parse(ver)
      const data = await meta(name)
      const candidates = Object.entries(data.versions)
        .filter(([, v]) => !v.deprecated)
        .map(([v]) => [v, parse(v)])
        .filter(([, p]) => p && p[0] === cur[0] && (cur[0] !== 0 || p[1] === cur[1]) && !(cur[0] === 0 && cur[1] === 0))
        .filter(([, p]) => cmp(p, cur) > 0)
        .sort((a, b) => cmp(b[1], a[1]))
      if (!candidates.length) continue
      const [next] = candidates[0]
      report.push({ file: file.slice(root.length + 1), section, name, from: spec, to: prefix + next, published: data.time?.[next] })
      if (apply) { pkg[section][name] = prefix + next; changed = true }
    }
  }
  if (apply && changed) {
    const indent = /^(\s+)"/m.exec(raw)?.[1] ?? '  '
    writeFileSync(file, JSON.stringify(pkg, null, indent) + (raw.endsWith('\n') ? '\n' : ''))
  }
}
for (const r of report) console.log(JSON.stringify(r))
