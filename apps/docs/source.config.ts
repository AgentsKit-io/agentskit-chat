import { defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config'

const inferredTitle = (source: string, path: string): string =>
  source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  ?? path.split('/').at(-1)?.replace(/\.mdx?$/, '').replace(/-/g, ' ')
  ?? 'AgentsKit Chat'

// The public repository docs are the canonical corpus. The site compiles them
// in place so prose cannot drift into an app-specific copy.
export const docs = defineDocs({
  dir: '../../docs',
  docs: { schema: context => frontmatterSchema.extend({ title: frontmatterSchema.shape.title.default(inferredTitle(context.source, context.path)) }) },
})

export default defineConfig({
  mdxOptions: {
    // Higher-contrast light theme so syntax colors stay readable while still
    // looking like real highlighting — not a gray wash.
    rehypeCodeOptions: {
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
    },
  },
})
