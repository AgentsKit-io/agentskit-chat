import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { ProductWordmark } from '@/components/agentskit-shell'
import { DocsAssistant } from '@/components/docs-assistant'
import { source } from '@/lib/source'

export default function DocumentationLayout({ children }: { readonly children: ReactNode }) {
  return <DocsLayout
    tree={source.pageTree}
    nav={{
      title: <ProductWordmark />,
      url: '/',
    }}
    links={[
      { text: 'Home', url: '/' },
      { text: 'How to', url: '/docs/guides/install-and-run' },
      { text: 'CLI', url: '/docs/cli' },
    ]}
    sidebar={{ defaultOpenLevel: 1, collapsible: true }}
  >
    {children}
    <DocsAssistant />
  </DocsLayout>
}
