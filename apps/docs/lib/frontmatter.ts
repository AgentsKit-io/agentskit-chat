import { splitFrontmatter } from '@agentskit/cross-platform/pure'
import { parseDocument, Scalar } from 'yaml'

/** Read one frontmatter scalar while keeping the existing output for inline values. */
export function readFrontmatterValue(body: string, key: string): string | undefined {
  const { frontmatter } = splitFrontmatter(body)
  if (frontmatter === null) return undefined

  const document = parseDocument(frontmatter)
  if (document.errors.length > 0) return undefined

  const node = document.get(key, true)
  if (!(node instanceof Scalar)) return undefined

  const value = node.type === Scalar.BLOCK_FOLDED || node.type === Scalar.BLOCK_LITERAL
    ? node.value
    : node.source ?? node.value

  if (typeof value !== 'string') return undefined
  if (node.type === Scalar.QUOTE_DOUBLE) return `"${value}"`.trim()
  if (node.type === Scalar.QUOTE_SINGLE) return `'${value}'`.trim()

  return value.trim()
}
