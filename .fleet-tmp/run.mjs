// Usage: node run.mjs <cwd> <tailLines> <cmd> [...args]
// Runs a command in cwd and prints exit code plus the last N lines of combined output.
import { spawnSync } from 'node:child_process'

const [cwd, tail, cmd, ...args] = process.argv.slice(2)
const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
const lines = `${r.stdout}\n${r.stderr}`.split('\n')
console.log(lines.slice(-Number(tail)).join('\n'))
console.log(`exit: ${r.status}`)
process.exit(r.status ?? 1)
