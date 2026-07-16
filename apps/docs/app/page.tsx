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
import { WorksWithLogos } from '@/components/works-with-logos'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  title: 'AgentsKit Chat — One AI chat. Every surface.',
  description:
    'The cross-framework application layer for AI chat. Define once, render natively on web, mobile, and terminal — React, Vue, Svelte, Solid, Angular, React Native, and Ink.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'AgentsKit Chat — One AI chat. Every surface.',
    description:
      'Ship production AI chat UIs across every AgentsKit client from one typed definition.',
    url: siteUrl,
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <main className="chat-marketing bg-ak-midnight text-ak-foam">
      {/* HERO */}
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
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ak-border bg-ak-surface font-mono text-sm font-bold text-ak-accent">
                ak
              </span>
              <span className="font-mono text-lg font-bold tracking-tight text-ak-foam">
                agentskit<span className="text-ak-graphite">.chat</span>
              </span>
              <span className="maturity-badge text-ak-graphite">Alpha</span>
            </div>

            <h1 className="mb-5 max-w-2xl text-[2.1rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl md:text-6xl">
              One AI chat.
              <span className="mt-1 block text-ak-graphite">Every surface.</span>
            </h1>

            <p className="mb-8 max-w-xl text-base leading-relaxed text-ak-graphite sm:text-lg">
              The application framework for AI chat interfaces in the agent era.
              Define routes, tools, policy, and components once — then ship native
              experiences on web, mobile, and terminal with the same signature.
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
                href="/docs"
                className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-ak-graphite transition hover:text-ak-foam"
              >
                Read the docs →
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

            <p className="mt-6 max-w-lg text-sm text-ak-graphite">
              The live demo on the right is the product story: tool calls, approvals,
              and multi-surface shells — not a stock chat bubble.
            </p>
          </div>

          <div className="min-w-0">
            <HeroDemo />
          </div>
        </div>
      </section>

      <WorksWithLogos />

      {/* FANOUT */}
      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            Architecture
          </p>
          <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            One definition. Everything else plugs in.
          </h2>
          <p className="mt-3 mb-10 max-w-2xl text-ak-graphite">
            AgentsKit Chat is the application layer — not another runtime. Compose
            once, fan out to every native shell AgentsKit already supports.
          </p>
          <ArchitectureFanout />
        </div>
      </section>

      {/* CODE PROOF */}
      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            Signature
          </p>
          <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            Same definition. Different shells.
          </h2>
          <p className="mt-3 mb-10 max-w-2xl text-ak-graphite">
            Streaming, tools, confirmation, retry, edit, and cancel stay AgentsKit
            behavior. Chat owns the application seams around them.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <HighlightedCode title="define once" lines={DEFINE_ONCE_LINES} />
            <HighlightedCode title="render everywhere" lines={RENDER_EVERYWHERE_LINES} />
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="border-b border-ak-border bg-ak-midnight px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ak-graphite">
            Why Chat
          </p>
          <h2 className="mt-2 max-w-3xl text-[1.75rem] font-bold leading-tight tracking-tight text-ak-foam sm:text-4xl">
            AI SDK hooks build a React UI.
            <span className="block text-ak-graphite">Chat builds a product surface.</span>
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              {
                title: 'One signature',
                body: 'Routes, actions, components, and sessions live in a single ChatDefinition — not seven forked apps.',
              },
              {
                title: 'Native everywhere',
                body: 'DOM, mobile, and terminal keep platform-native UX and a11y. No fake universal webview.',
              },
              {
                title: 'Model-safe by design',
                body: 'Only registered actions and components can run. Policy and confirmation stay outside the model.',
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-ak-border bg-ak-surface/70 p-5"
              >
                <h3 className="font-mono text-sm font-semibold text-ak-foam">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ak-graphite">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-ak-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ak-border bg-ak-surface/50">
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ak-graphite">If you need…</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ak-graphite">Start here</th>
                </tr>
              </thead>
              <tbody className="text-ak-foam">
                <tr className="border-b border-ak-border">
                  <td className="px-4 py-3 text-ak-graphite">Adapters, tools, memory, RAG, runtime</td>
                  <td className="px-4 py-3"><a className="text-ak-blue hover:underline" href="https://www.agentskit.io/docs">AgentsKit</a></td>
                </tr>
                <tr className="border-b border-ak-border">
                  <td className="px-4 py-3 text-ak-graphite">Same agent UX across web, mobile, terminal</td>
                  <td className="px-4 py-3 font-semibold">AgentsKit Chat</td>
                </tr>
                <tr className="border-b border-ak-border">
                  <td className="px-4 py-3 text-ak-graphite">Ready-made agent starting points</td>
                  <td className="px-4 py-3"><a className="text-ak-blue hover:underline" href="https://registry.agentskit.io">Registry</a></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-ak-graphite">Enterprise orchestration & governance</td>
                  <td className="px-4 py-3"><a className="text-ak-blue hover:underline" href="https://akos.agentskit.io">AKOS</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-ak-midnight px-4 py-24 sm:px-6 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(700px 300px at 50% 0%, color-mix(in srgb, var(--ak-accent) 22%, transparent), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-ak-foam sm:text-5xl">
            Build the chat your product actually ships.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ak-graphite">
            Scaffold a renderer, keep one definition, then grow into routes, policy,
            components, sessions, and grounded Ask backends.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center rounded-md bg-ak-foam px-6 py-3 text-sm font-semibold text-ak-midnight transition hover:bg-white"
            >
              Get started
            </Link>
            <Link
              href="/docs/product/positioning"
              className="inline-flex items-center rounded-md border border-ak-border px-5 py-3 text-sm font-medium text-ak-foam transition hover:border-ak-blue"
            >
              Why not AI SDK UI?
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
