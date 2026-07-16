import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { canonicalHomepage, inspectRelease, releaseRepositoryUrl } from './release-lib.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicPackages = [
  { name: '@agentskit/chat', directory: 'chat' },
  { name: '@agentskit/chat-cli', directory: 'cli' },
]

describe('release package metadata', () => {
  it('pins the canonical documentation homepage and repository URL for both public packages', () => {
    for (const item of publicPackages) {
      const manifest = JSON.parse(readFileSync(new URL(`../packages/${item.directory}/package.json`, import.meta.url), 'utf8'))
      expect(manifest.name).toBe(item.name)
      expect(manifest.homepage).toBe(canonicalHomepage)
      expect(manifest.repository).toEqual({
        type: 'git',
        url: releaseRepositoryUrl,
        directory: `packages/${item.directory}`,
      })
      expect(manifest.bugs).toEqual({
        url: 'https://github.com/AgentsKit-io/agentskit-chat/issues',
      })
    }
  })

  it('accepts the current release graph when the workspace is built', async () => {
    const result = await inspectRelease(root)
    expect(result.diagnostics.filter(item => item.includes('homepage'))).toEqual([])
    expect(result.release.packages.map(item => item.name)).toEqual([
      '@agentskit/chat',
      '@agentskit/chat-cli',
    ])
    for (const item of result.release.packages) {
      const manifest = JSON.parse(readFileSync(new URL(`../packages/${item.directory}/package.json`, import.meta.url), 'utf8'))
      expect(manifest.homepage).toBe(canonicalHomepage)
      expect(manifest.version).toBe(result.release.version)
    }
  })
})
