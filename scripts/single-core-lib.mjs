// RF-01: a clean install of @agentskit/chat next to the AgentsKit packages must resolve one @agentskit/core.

// Registry packages a product installs next to @agentskit/chat (ranges follow the chat peer ranges).
export const consumerCompanions = {
  '@agentskit/react': '>=0.7.1 <1',
  '@agentskit/adapters': '*',
  '@agentskit/memory': '^0.12.0',
  '@agentskit/observability': '>=0.13.0 <1',
  '@agentskit/core': '^1.15.0',
  react: '>=18',
  'react-dom': '>=18',
}

// Versions of @agentskit/core listed in a pnpm-lock.yaml (v9 `packages:` section keys).
export const coreVersionsInLockfile = lockfileText => {
  const versions = new Set()
  for (const match of lockfileText.matchAll(/^ {2}'?@agentskit\/core@([^':\s(]+)[^:\n]*'?:/gm)) versions.add(match[1])
  return [...versions].sort()
}

export const assertSingleCore = lockfileText => {
  const versions = coreVersionsInLockfile(lockfileText)
  if (versions.length === 0) throw new Error('lockfile does not resolve @agentskit/core at all')
  if (versions.length > 1) throw new Error(`lockfile resolves ${versions.length} copies of @agentskit/core: ${versions.join(', ')}`)
  return versions[0]
}
