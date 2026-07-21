import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import { ProductHeader } from '@/components/product-header'
import { SharedEcosystemBar } from '@/components/shared-ecosystem-bar'
import '@agentskit/react/theme'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'AgentsKit Chat', template: '%s · AgentsKit Chat' },
  description:
    'The cross-framework framework for AI chat interfaces — one typed definition, native shells for web, mobile, and terminal.',
  applicationName: 'AgentsKit Chat',
  authors: [{ name: 'AgentsKit', url: 'https://www.agentskit.io' }],
  creator: 'AgentsKit',
  keywords: ['AI chat UI', 'agent interface', 'React', 'React Native', 'terminal UI', 'AgentsKit'],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'AgentsKit Chat',
    url: siteUrl,
    title: 'AgentsKit Chat — One agent experience. Every surface.',
    description:
      'Define once. Render natively on React, Vue, Svelte, Solid, Angular, React Native, and Ink.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AgentsKit Chat — One agent experience. Every surface.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentsKit Chat — One agent experience. Every surface.',
    description: 'Define once. Render natively on web, mobile, and terminal.',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-ak-midnight text-ak-foam antialiased">
        <SharedEcosystemBar />
        <RootProvider theme={{ defaultTheme: 'system', enabled: true, enableSystem: true }}>
          <ProductHeader />
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
