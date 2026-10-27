import { readFileSync } from 'node:fs'
const i = JSON.parse(readFileSync('.doc-bridge/index.json', 'utf8'))
const entries = i.projection.entries
const byId = new Map(entries.map((e) => [e.id, e]))
const areas = entries.filter((e) => e.kind === 'area' && !e.graph.coveredBy.length && !e.graph.mentionedBy.length)
console.log('UNDOC AREAS', areas.length)
for (const a of areas) console.log(a.id)
const docs = entries.filter((e) => e.kind === 'document' && !e.graph.outbound.some((o) => { const t = byId.get(o.id); return t && t.kind !== 'document' }))
console.log('UNLINKED DOCS', docs.length)
for (const d of docs) console.log(d.id)
