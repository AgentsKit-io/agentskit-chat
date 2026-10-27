import os from 'node:os'
import { readFileSync } from 'node:fs'
const mb = n => Math.round(n / 2 ** 20)
let limit = 'n/a'
try { limit = readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim() } catch {}
console.log({ totalMb: mb(os.totalmem()), freeMb: mb(os.freemem()), cpus: os.cpus().length, cgroupMax: limit })
