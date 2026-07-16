import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DocsAssistant } from '@/components/docs-assistant'
import { source } from '@/lib/source'

export default function DocumentationLayout({ children }: { readonly children: ReactNode }) {
  return <DocsLayout
    tree={source.pageTree}
    nav={{ title: <Link className="font-semibold" href="/docs">AgentsKit Chat <span className="maturity-badge ml-2">Alpha</span></Link>, url: '/docs' }}
    links={[
      { text: 'Stability', url: '/docs/releases/stability' },
      { text: 'llms.txt', url: '/llms.txt', external: true },
      { text: 'GitHub', url: 'https://github.com/AgentsKit-io/agentskit-chat', external: true },
    ]}
    sidebar={{ defaultOpenLevel: 1, collapsible: true }}
  >
    {children}
    <DocsAssistant />
  </DocsLayout>
}
