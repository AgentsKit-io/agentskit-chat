/**
 * Public documentation surface for chat.agentskit.io.
 * Everything else under docs/ stays in the repository for maintainers/agents
 * but is not compiled into the public site tree.
 */
export const PUBLIC_DOC_GLOBS = [
  'index.mdx',
  'getting-started/**/*',
  'guides/**/*',
  'components/**/*',
  'theming-and-composition.md',
  'server.md',
  'backend.md',
  'sessions.md',
  'deployment.md',
  'cli.md',
  'api-reference.md',
  'conversation/**/*',
  'actions/**/*',
  'lifecycle.md',
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
  'examples',
  'releases/alpha',
  'releases/launch',
  'releases/migration',
  'releases/release-process',
  'releases/v0',
] as const

export function isPublicDocPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.?\//, '')
  if (PRIVATE_DOC_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`) || normalized.startsWith(prefix))) {
    // allow releases/stability + compatibility only
    if (normalized === 'releases/stability.md' || normalized === 'releases/compatibility.md') return true
    if (normalized.startsWith('releases/') && !normalized.includes('stability') && !normalized.includes('compatibility')) return false
    if (!normalized.startsWith('releases/')) return false
  }
  // explicit public set via path rules
  if (normalized === 'index.mdx') return true
  if (normalized.startsWith('getting-started/')) return true
  if (normalized.startsWith('guides/')) return true
  if (normalized.startsWith('examples/')) return true
  if (normalized.startsWith('components/')) return true
  if (normalized === 'theming-and-composition.md') return true
  if (['server.md', 'backend.md', 'sessions.md', 'deployment.md', 'cli.md', 'api-reference.md', 'lifecycle.md'].includes(normalized)) return true
  if (normalized.startsWith('conversation/')) return true
  if (normalized.startsWith('actions/')) return true
  if (normalized === 'releases/stability.md' || normalized === 'releases/compatibility.md') return true
  return false
}
