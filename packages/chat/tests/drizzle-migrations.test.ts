import { readFile, readdir } from 'node:fs/promises'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import type { DrizzleSnapshotJSON } from 'drizzle-kit/api'
import { describe, expect, it } from 'vitest'
import { chatDecisionTable, chatSessionTable } from '../src/drizzle-pg.js'

const folder = new URL('../drizzle/', import.meta.url)

describe('RF-07 shipped drizzle-kit migrations', () => {
  it('match the exported session and decision tables, so drizzle-kit generate has nothing new to write', async () => {
    const journal = JSON.parse(await readFile(new URL('meta/_journal.json', folder), 'utf8')) as { entries: { idx: number; tag: string }[] }
    const last = journal.entries.at(-1)
    expect(last).toBeDefined()
    const snapshot = JSON.parse(await readFile(new URL(`meta/${String(last?.idx).padStart(4, '0')}_snapshot.json`, folder), 'utf8')) as DrizzleSnapshotJSON
    const exported = generateDrizzleJson({ chatSessionTable, chatDecisionTable }, snapshot.id)
    expect(await generateMigration(snapshot, exported)).toEqual([])
  })

  it('keep the baseline adoptable by databases created with the 0.7.0 DDL', async () => {
    const files = (await readdir(folder)).filter(file => file.endsWith('.sql')).sort()
    const baseline = await readFile(new URL(files[0] ?? '', folder), 'utf8')
    expect(baseline.match(/CREATE TABLE "/g)).toBeNull()
    expect(baseline.match(/CREATE TABLE IF NOT EXISTS "/g)).toHaveLength(2)
  })
})
