import { defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config'

const inferredTitle = (source: string, path: string): string =>
  source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  ?? path.split('/').at(-1)?.replace(/\.mdx?$/, '').replace(/-/g, ' ')
  ?? 'AgentsKit Chat'

export const docs = defineDocs({
  dir: '../../docs',
  docs: {
    schema: context => frontmatterSchema.extend({
      title: frontmatterSchema.shape.title.default(inferredTitle(context.source, context.path)),
    }),
  },
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-dark-default',
        dark: 'github-dark-default',
      },
    },
  },
})
