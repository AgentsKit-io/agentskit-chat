import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import { SharedEcosystemBar } from '@/components/shared-ecosystem-bar'
import '@agentskit/react/theme'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'AgentsKit Chat', template: '%s · AgentsKit Chat' },
  description:
    'The cross-framework framework for AI chat interfaces — one typed definition, native shells for web, mobile, and terminal.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'AgentsKit Chat',
    url: siteUrl,
    title: 'AgentsKit Chat — One agent experience. Every surface.',
    description:
      'Define once. Render natively on React, Vue, Svelte, Solid, Angular, React Native, and Ink.',
  },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-ak-midnight text-ak-foam antialiased">
        <SharedEcosystemBar />
        <RootProvider theme={{ defaultTheme: 'system', enabled: true, enableSystem: true }}>
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
