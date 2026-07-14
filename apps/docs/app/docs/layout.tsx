import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DocsAssistant } from '@/components/docs-assistant'
import { source } from '@/lib/source'

export default function DocumentationLayout({ children }: { readonly children: ReactNode }) {
  return <DocsLayout
    tree={source.pageTree}
    nav={{ title: <Link className="font-semibold" href="/">AgentsKit Chat <span className="maturity-badge ml-2">Alpha</span></Link>, url: '/' }}
    links={[
      { text: 'Stability', url: '/docs/releases/stability' },
      { text: 'llms.txt', url: '/llms.txt', external: true },
    ]}
    githubUrl="https://github.com/AgentsKit-io/agentskit-chat"
    sidebar={{ defaultOpenLevel: 1, collapsible: true }}
  >
    {children}
    <DocsAssistant />
  </DocsLayout>
}
