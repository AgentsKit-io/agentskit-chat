import type { Metadata } from 'next'
import Link from 'next/link'
import { ArchitectureFanout } from '@/components/architecture-fanout'
import { HeroDemo } from '@/components/hero-demo/hero-demo'
import {
  DEFINE_ONCE_LINES,
  HighlightedCode,
  RENDER_EVERYWHERE_LINES,
} from '@/components/highlighted-code'
import { InstallCommand } from '@/components/install-command'
import { SharedEcosystemShowcase } from '@/components/shared-ecosystem-showcase'
import { WorksWithLogos } from '@/components/works-with-logos'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  title: 'AgentsKit Chat — One AI chat. Every surface.',
  description:
    'The cross-framework application layer for AI chat. Define once, render natively on web, mobile, and terminal.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'AgentsKit Chat — One AI chat. Every surface.',
    description: 'Ship AI chat UIs across React, Vue, Svelte, Solid, Angular, React Native, and Ink.',
    url: siteUrl,
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <main className="chat-marketing bg-ak-midnight text-ak-foam">
      <section className="relative overflow-hidden px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 md:pt-24 md:pb-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              'radial-gradient(900px 420px at 15% -10%, color-mix(in srgb, var(--ak-accent) 28%, transparent), transparent 55%), radial-gradient(700px 360px at 90% 0%, color-mix(in srgb, var(--ak-blue) 16%, transparent), transparent 50%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-end">
          <div className="min-w-0">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">
              AgentsKit Chat
            </p>

            <h1 className="mb-5 max-w-2xl text-[2.1rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl md:text-6xl">
              One AI chat.
              <span className="mt-1 block text-ak-graphite">Every surface.</span>
            </h1>

            <p className="mb-8 max-w-xl text-base leading-relaxed text-ak-graphite sm:text-lg">
              Define the agent experience once. Ship native shells on web, mobile, and terminal —
              same routes, policy, components, and sessions.
            </p>

            <div className="mb-6 w-full max-w-xl">
              <InstallCommand />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-md bg-ak-foam px-5 py-2.5 text-sm font-semibold text-ak-midnight transition hover:bg-white"
              >
                Start building
              </Link>
              <Link
                href="/docs/guides/install-and-run"
                className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-ak-graphite transition hover:text-ak-foam"
              >
                Install & run →
              </Link>
              <a
                href="https://github.com/AgentsKit-io/agentskit-chat"
                className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-ak-graphite transition hover:text-ak-foam"
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <HeroDemo />
          </div>
        </div>
      </section>

      <WorksWithLogos />

      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            Architecture
          </p>
          <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            One definition. Everything else plugs in.
          </h2>
          <p className="mt-3 mb-6 max-w-2xl text-ak-graphite">
            AgentsKit Chat is the application layer — not another runtime. Compose once, fan out to
            every native shell AgentsKit already supports.
          </p>
          <ArchitectureFanout />
        </div>
      </section>

      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            Signature
          </p>
          <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            Same definition. Different shells.
          </h2>
          <p className="mt-3 mb-10 max-w-2xl text-ak-graphite">
            Streaming, tools, confirmation, retry, edit, and cancel stay AgentsKit behavior. Chat
            owns the application seams around them.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <HighlightedCode title="define once" lines={DEFINE_ONCE_LINES} />
            <HighlightedCode title="render everywhere" lines={RENDER_EVERYWHERE_LINES} />
          </div>
        </div>
      </section>

      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            Build the product path
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/docs/guides/install-and-run', title: 'Install & run', body: 'Scaffold and start in minutes.' },
              { href: '/docs/guides/add-rag', title: 'Add RAG', body: 'Wire AgentsKit retrieval + citations.' },
              { href: '/docs/guides/connect-backend', title: 'Connect backend', body: 'Handlers, Ask, sessions.' },
              { href: '/docs/components/catalog', title: 'Components', body: 'Schema-backed interactive UI.' },
              { href: '/docs/guides/style', title: 'Style', body: 'Theme tokens and native slots.' },
              { href: '/docs/cli', title: 'CLI', body: 'init, add component, completion.' },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-2xl border border-ak-border bg-ak-surface/60 p-5 transition hover:border-ak-blue/40"
              >
                <div className="font-mono text-sm font-semibold text-ak-foam">{card.title}</div>
                <p className="mt-2 text-sm text-ak-graphite">{card.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SharedEcosystemShowcase />

      <section className="relative overflow-hidden bg-ak-midnight px-4 py-24 sm:px-6">
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl">
            Ship the chat your product actually runs.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center rounded-md bg-ak-foam px-6 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white"
            >
              Get started
            </Link>
            <Link
              href="/docs/cli"
              className="inline-flex items-center rounded-md border border-ak-border px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue"
            >
              CLI reference
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
