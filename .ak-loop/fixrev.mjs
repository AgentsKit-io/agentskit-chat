import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const f = 'readme-standard-v1.json'
const old = execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8' })
const oldLines = old.split('\n')
const cur = readFileSync(f, 'utf8').split('\n')
if (oldLines.length !== cur.length) throw new Error('line count differs')
const out = cur.map((l, i) => (/"(reviewedOn|reviewDueOn)"/.test(l) ? oldLines[i] : l))
writeFileSync(f, out.join('\n'))
