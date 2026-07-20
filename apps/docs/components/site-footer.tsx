import Link from 'next/link'
import { ecosystemBarProducts } from '@/lib/ecosystem'

const resources = [
  { label: 'Documentation', href: '/docs' },
  { label: 'CLI', href: '/docs/cli' },
  { label: 'llms.txt', href: '/llms.txt' },
  { label: 'GitHub', href: 'https://github.com/AgentsKit-io/agentskit-chat' },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-ak-border bg-ak-midnight px-4 py-12 text-ak-foam sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="max-w-sm">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight text-ak-foam">
            AgentsKit Chat
          </Link>
          <p className="mt-3 text-sm font-medium text-ak-foam">
            One agent experience. Every surface.
          </p>
          <p className="mt-2 text-sm leading-6 text-ak-graphite">
            Define routes, policy, components, and sessions once. Render them natively on web,
            mobile, and terminal.
          </p>
        </div>

        <nav aria-label="AgentsKit products">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            AgentsKit ecosystem
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {ecosystemBarProducts.map(product => (
              <li key={product.id}>
                <a
                  href={product.href}
                  aria-current={product.id === 'agentskit-chat' ? 'page' : undefined}
                  className="inline-flex min-h-8 items-center text-sm text-ak-graphite transition hover:text-ak-foam focus-visible:text-ak-foam"
                >
                  {product.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-ak-border pt-6 text-xs text-ak-graphite sm:flex-row sm:items-center sm:justify-between">
        <p>Open source · Built on AgentsKit</p>
        <nav aria-label="Chat resources">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {resources.map(resource => (
              <li key={resource.href}>
                <a href={resource.href} className="transition hover:text-ak-foam focus-visible:text-ak-foam">
                  {resource.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
