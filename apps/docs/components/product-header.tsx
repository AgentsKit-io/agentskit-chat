'use client'

import { SearchToggle } from 'fumadocs-ui/components/layout/search-toggle'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const links = [
  { href: '/docs', label: 'Docs' },
  { href: '/docs/components/catalog', label: 'Components' },
  { href: '/docs/cli', label: 'CLI' },
] as const

function ChatMark() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7" fill="none">
    <path d="M7.5 5.5h13A3.5 3.5 0 0 1 24 9v7.5a3.5 3.5 0 0 1-3.5 3.5h-6l-5 3.5V20h-2A3.5 3.5 0 0 1 4 16.5V9a3.5 3.5 0 0 1 3.5-3.5Z" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="10" cy="13" r="1.2" fill="currentColor" />
    <circle cx="14" cy="13" r="1.2" fill="currentColor" />
    <circle cx="18" cy="13" r="1.2" fill="currentColor" />
  </svg>
}

function GitHubMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.92c-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 7.01c.85 0 1.69.12 2.49.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.77c0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
  </svg>
}

export function ProductHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  return <header className="product-header sticky top-0 z-50 h-14 border-b border-ak-border bg-ak-midnight/95 text-ak-foam backdrop-blur-lg">
    <nav aria-label="AgentsKit Chat" className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md text-ak-foam transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue sm:min-w-0">
        <span className="text-ak-accent"><ChatMark /></span>
        <span className="text-sm font-semibold tracking-tight">AgentsKit Chat</span>
      </Link>

      <div className="ml-auto hidden h-full items-center gap-1 md:flex">
        {links.map((link) => <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href || (link.href === '/docs' && pathname.startsWith('/docs/')) ? 'page' : undefined}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ak-graphite transition-colors hover:bg-ak-surface hover:text-ak-foam aria-[current=page]:text-ak-foam"
        >{link.label}</Link>)}
        <a href="https://github.com/AgentsKit-io/agentskit-chat" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ak-graphite transition-colors hover:bg-ak-surface hover:text-ak-foam">
          <GitHubMark /> GitHub
        </a>
      </div>

      <SearchToggle className="ml-auto size-11 rounded-md text-ak-graphite hover:bg-ak-surface hover:text-ak-foam md:ml-1" />
      <button
        type="button"
        aria-label={open ? 'Close product navigation' : 'Open product navigation'}
        aria-expanded={open}
        aria-controls="product-navigation-menu"
        onClick={() => setOpen(value => !value)}
        className="inline-flex size-11 items-center justify-center rounded-md text-ak-graphite transition-colors hover:bg-ak-surface hover:text-ak-foam md:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
        </svg>
      </button>
    </nav>

    {open ? <nav id="product-navigation-menu" aria-label="AgentsKit Chat mobile" className="absolute inset-x-0 top-14 border-b border-ak-border bg-ak-midnight p-3 shadow-xl md:hidden">
      <div className="mx-auto grid max-w-6xl gap-1">
        {links.map((link) => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ak-graphite hover:bg-ak-surface hover:text-ak-foam">{link.label}</Link>)}
        <a href="https://github.com/AgentsKit-io/agentskit-chat" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ak-graphite hover:bg-ak-surface hover:text-ak-foam"><GitHubMark /> GitHub</a>
      </div>
    </nav> : null}
  </header>
}
