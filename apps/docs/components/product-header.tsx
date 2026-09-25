'use client'

import { SearchToggle } from 'fumadocs-ui/components/layout/search-toggle'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProductWordmark } from '@/components/agentskit-shell'

const links = [
  { href: '/docs', label: 'Docs' },
  { href: '/docs/components/catalog', label: 'Components' },
  { href: '/docs/cli', label: 'CLI' },
] as const

export function ProductHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  return <header className="product-header sticky top-0 z-50 h-14 border-b border-ak-border bg-ak-midnight/95 text-ak-foam backdrop-blur-lg">
    <nav aria-label="AgentsKit Chat" className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4 sm:px-6">
      <Link href="/" className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md text-ak-foam transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue sm:min-w-0">
        <ProductWordmark />
      </Link>

      <div className="ml-auto hidden h-full items-center gap-1 md:flex">
        {links.map((link) => <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href || (link.href === '/docs' && pathname.startsWith('/docs/')) ? 'page' : undefined}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ak-graphite transition-colors hover:bg-ak-surface hover:text-ak-foam aria-[current=page]:text-ak-foam"
        >{link.label}</Link>)}
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
      </div>
    </nav> : null}
  </header>
}
