import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DocsAssistant } from '@/components/docs-assistant'
import { source } from '@/lib/source'

export default function DocumentationLayout({ children }: { readonly children: ReactNode }) {
  return <DocsLayout
    tree={source.pageTree}
    nav={{
      title: (
        <Link className="font-semibold" href="/">
          AgentsKit Chat
        </Link>
      ),
      url: '/',
    }}
    links={[
      { text: 'Home', url: '/' },
      { text: 'How to', url: '/docs/guides/install-and-run' },
      { text: 'CLI', url: '/docs/cli' },
      { text: 'GitHub', url: 'https://github.com/AgentsKit-io/agentskit-chat', external: true },
    ]}
    sidebar={{ defaultOpenLevel: 1, collapsible: true }}
  >
    {children}
    <DocsAssistant />
  </DocsLayout>
}
