import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.mdx?$/.test(f)) out.push(p)
  }
  return out
}
const files = walk('docs')
for (const sym of process.argv.slice(2)) {
  console.log(sym, '=>', files.filter((f) => readFileSync(f, 'utf8').includes(sym)).join(' '))
}
