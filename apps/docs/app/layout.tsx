import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'AgentsKit Chat', template: '%s · AgentsKit Chat' },
  description: 'Build deterministic, interactive agent chats for every AgentsKit client.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'AgentsKit Chat', url: siteUrl },
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><RootProvider>{children}</RootProvider></body></html>
}
