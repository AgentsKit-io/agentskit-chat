/**
 * Public documentation surface for chat.agentskit.io.
 * Everything else under docs/ stays in the repository for maintainers/agents
 * but is not compiled into the public site tree.
 */
export const PUBLIC_DOC_GLOBS = [
  'index.mdx',
  'getting-started/**/*',
  'guides/**/*',
  'examples/**/*',
  'components/**/*',
  'theming-and-composition.md',
  'theming-and-composition.mdx',
  'server.md',
  'server.mdx',
  'backend.md',
  'backend.mdx',
  'sessions.md',
  'sessions.mdx',
  'deployment.md',
  'deployment.mdx',
  'cli.md',
  'cli.mdx',
  'api-reference.md',
  'api-reference.mdx',
  'conversation/**/*',
  'actions/**/*',
  'lifecycle.md',
  'lifecycle.mdx',
  'releases/stability.md',
  'releases/compatibility.md',
] as const

/** Top-level prefixes that must never appear in the public sidebar. */
export const PRIVATE_DOC_PREFIXES = [
  'architecture',
  'product',
  'dogfood',
  'for-agents',
  'governance',
  'conformance',
  'protocol',
  'devtools',
  'releases/alpha',
  'releases/launch',
  'releases/migration',
  'releases/release-process',
  'releases/v0',
] as const

const PUBLIC_TOP_LEVEL = new Set([
  'theming-and-composition.md',
  'theming-and-composition.mdx',
  'server.md',
  'server.mdx',
  'backend.md',
  'backend.mdx',
  'sessions.md',
  'sessions.mdx',
  'deployment.md',
  'deployment.mdx',
  'cli.md',
  'cli.mdx',
  'api-reference.md',
  'api-reference.mdx',
  'lifecycle.md',
  'lifecycle.mdx',
  'index.mdx',
])

export function isPublicDocPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.?\//, '')

  if (
    PRIVATE_DOC_PREFIXES.some(
      (prefix) =>
        normalized === prefix ||
        normalized.startsWith(`${prefix}/`) ||
        normalized.startsWith(prefix),
    )
  ) {
    if (normalized === 'releases/stability.md' || normalized === 'releases/compatibility.md') return true
    if (normalized.startsWith('releases/')) return false
    return false
  }

  if (PUBLIC_TOP_LEVEL.has(normalized)) return true
  if (normalized.startsWith('getting-started/')) return true
  if (normalized.startsWith('guides/')) return true
  if (normalized.startsWith('examples/')) {
    // product examples only — skip legacy reference dumps
    if (normalized.includes('reference') || normalized.includes('dom-renderer') || normalized.includes('parity')) {
      return false
    }
    return true
  }
  if (normalized.startsWith('components/')) {
    // hide generated matrix from primary reading path optional - allow catalog
    if (normalized.endsWith('catalog.generated.md')) return false
    return true
  }
  if (normalized.startsWith('conversation/')) return true
  if (normalized.startsWith('actions/')) return true
  if (normalized === 'releases/stability.md' || normalized === 'releases/compatibility.md') return true
  return false
}
