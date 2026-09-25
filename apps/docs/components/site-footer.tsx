import Link from 'next/link'
import { ecosystemBarProducts } from '@/lib/ecosystem'

const columns = [
  {
    title: 'Start',
    links: [
      { label: 'Get started', href: '/docs/getting-started' },
      { label: 'Install & run', href: '/docs/guides/install-and-run' },
      { label: 'Live examples', href: '/docs/reference/examples' },
      { label: 'Add RAG', href: '/docs/guides/add-rag' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Components', href: '/docs/components/catalog' },
      { label: 'CLI', href: '/docs/cli' },
      { label: 'Connect backend', href: '/docs/guides/connect-backend' },
      { label: 'Style', href: '/docs/guides/style' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'llms.txt', href: '/llms.txt' },
      { label: 'GitHub', href: 'https://github.com/AgentsKit-io/agentskit-chat' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="chat-home-footer px-4 pt-16 pb-10 text-ak-foam sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="min-w-0">
          <Link href="/" className="font-mono text-base font-bold tracking-tight text-ak-foam">
            AgentsKit Chat <span className="font-normal text-ak-graphite">· MIT</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ak-graphite">
            One agent experience across web, mobile, and terminal.
          </p>
        </div>

        {columns.slice(0, 2).map(column => (
          <FooterColumn key={column.title} title={column.title} links={column.links} />
        ))}

        <nav aria-label="AgentsKit ecosystem" data-footer-column="Ecosystem" className="min-w-0">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ak-graphite">
            Ecosystem
          </h2>
          <ul className="space-y-2.5">
            {ecosystemBarProducts.map(product => (
              <li key={product.id}>
                {product.id === 'agentskit-chat' ? (
                  <span aria-current="page" className="text-sm font-medium text-ak-blue">
                    {product.label}
                  </span>
                ) : (
                  <a
                    href={product.href}
                    className="text-sm text-ak-graphite transition hover:text-ak-blue"
                  >
                    {product.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <FooterColumn title={columns[2].title} links={columns[2].links} />
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: readonly { label: string; href: string }[]
}) {
  return (
    <nav aria-label={title} data-footer-column={title} className="min-w-0">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ak-graphite">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {links.map(link => (
          <li key={link.href}>
            {link.href.startsWith('http') ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-ak-graphite transition hover:text-ak-blue">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="text-sm text-ak-graphite transition hover:text-ak-blue">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
