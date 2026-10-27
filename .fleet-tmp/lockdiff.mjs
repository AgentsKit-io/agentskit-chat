// Usage: node lockdiff.mjs <oldLock> <newLock> [namePattern]
// Lists package@version keys added/removed between two pnpm lockfiles.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read = ref => ref.startsWith('git:')
  ? execFileSync('git', ['show', ref.slice(4)], { encoding: 'utf8', maxBuffer: 1 << 28 })
  : readFileSync(ref, 'utf8')

const keys = file => {
  const text = read(file)
  const start = text.indexOf('\npackages:\n')
  const end = text.indexOf('\nsnapshots:\n')
  const out = new Set()
  for (const line of text.slice(start, end).split('\n')) {
    const m = /^  '?([^'\s]+@[^'(\s:]+)'?:/.exec(line)
    if (m) out.add(m[1])
  }
  return out
}
const [a, b] = [keys(process.argv[2]), keys(process.argv[3])]
const pattern = process.argv[4] ? new RegExp(process.argv[4]) : null
const show = k => !pattern || pattern.test(k)
const removed = [...a].filter(k => !b.has(k) && show(k)).sort()
const added = [...b].filter(k => !a.has(k) && show(k)).sort()
console.log(`removed ${removed.length}, added ${added.length}`)
for (const k of removed) console.log('- ' + k)
for (const k of added) console.log('+ ' + k)
