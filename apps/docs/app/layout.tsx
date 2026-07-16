import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import { SharedEcosystemBar } from '@/components/shared-ecosystem-bar'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AgentsKit Chat — cross-framework agent applications',
    template: '%s · AgentsKit Chat',
  },
  description:
    'Experience layer on the AgentsKit foundation — define one agent chat application and render it natively across clients.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'AgentsKit Chat',
    url: siteUrl,
    title: 'AgentsKit Chat — cross-framework agent applications',
    description:
      'Built on AgentsKit primitives. Application composition for web, mobile, and terminal chat surfaces.',
  },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body>
    <SharedEcosystemBar />
    <RootProvider>{children}</RootProvider>
  </body></html>
}
