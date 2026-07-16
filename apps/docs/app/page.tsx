import type { Metadata } from 'next'
import Link from 'next/link'
import { InstallCommand } from '@/components/install-command'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chat.agentskit.io'

export const metadata: Metadata = {
  title: 'AgentsKit Chat — One AI chat. Every surface.',
  description:
    'The cross-framework application layer for AI chat interfaces. Define once, render natively on web, mobile, and terminal with the same signature.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'AgentsKit Chat — One AI chat. Every surface.',
    description:
      'Build production AI chat UIs for React, Vue, Svelte, Solid, Angular, React Native, and Ink from one typed definition.',
    url: siteUrl,
    type: 'website',
  },
}

const SURFACES = [
  { name: 'React', detail: 'Web & design systems' },
  { name: 'Vue', detail: 'Composition API' },
  { name: 'Svelte', detail: 'Svelte 5 shells' },
  { name: 'Solid', detail: 'Reactive UI' },
  { name: 'Angular', detail: 'Enterprise web' },
  { name: 'React Native', detail: 'iOS & Android' },
  { name: 'Ink', detail: 'Terminal / TUI' },
] as const

const PROMISES = [
  {
    title: 'One signature',
    body: 'Routes, actions, components, sessions, and policy live in a single ChatDefinition — not seven forked apps.',
  },
  {
    title: 'Native everywhere',
    body: 'Each surface uses its AgentsKit binding. DOM, mobile, and terminal keep platform-native UX and a11y.',
  },
  {
    title: 'Model-safe by design',
    body: 'Only registered actions and components can run. Confirmation, auth, and audit stay outside the model.',
  },
] as const

export default function HomePage() {
  return (
    <main className="chat-landing">
      <div className="chat-landing-shell">
        <section className="chat-landing-hero" aria-labelledby="hero-title">
          <div>
            <p className="chat-landing-kicker">AgentsKit Chat · v0.4</p>
            <h1 id="hero-title">One AI chat. Every surface.</h1>
            <p className="lede">
              The go-to application framework for building AI chat interfaces in the age of agents —
              web, desktop, mobile, and terminal with the same typed signature. Define the product once.
              Ship native experiences everywhere AgentsKit already runs.
            </p>
            <div className="chat-landing-actions">
              <Link className="chat-landing-cta chat-landing-cta-primary" href="/docs/getting-started">
                Start building
              </Link>
              <Link className="chat-landing-cta chat-landing-cta-secondary" href="/docs">
                Read the docs
              </Link>
              <a
                className="chat-landing-cta chat-landing-cta-secondary"
                href="https://github.com/AgentsKit-io/agentskit-chat"
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="chat-panel" aria-label="Quick start">
            <header>
              <span>Scaffold in one command</span>
              <span className="maturity-badge">Alpha</span>
            </header>
            <div className="p-3">
              <InstallCommand />
              <p className="mt-2 px-1 text-xs leading-relaxed text-fd-muted-foreground">
                Creates a shared definition, Web-standard handler, native shell, and test —
                without copying an AgentsKit runtime.
              </p>
            </div>
          </div>
        </section>

        <section className="chat-section" aria-labelledby="surfaces-title">
          <h2 id="surfaces-title">Seven native shells. One product brain.</h2>
          <p>
            Stop rebuilding chat for each client. AgentsKit Chat is the missing application layer:
            opinionated contracts on top of AgentsKit adapters, tools, memory, and RAG — then native
            renderers that feel like the host platform, not a bolted-on webview.
          </p>
          <div className="chat-surface-grid">
            {SURFACES.map((surface) => (
              <div key={surface.name} className="chat-surface-card">
                <strong>{surface.name}</strong>
                <span>{surface.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="chat-section" aria-labelledby="proof-title">
          <h2 id="proof-title">Same definition. Different shells.</h2>
          <p>
            Write the agent experience once. Pass it to any renderer subpath. Streaming, tools,
            confirmation, retry, edit, and cancel stay AgentsKit behavior — Chat owns the application
            seams around them.
          </p>
          <div className="chat-proof-grid">
            <article className="chat-panel">
              <header>define once</header>
              <pre>{`import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const supportChat = (adapter: AdapterFactory) =>
  defineChat({
    id: 'support',
    chat: {
      adapter,
      systemPrompt: 'Help users ship faster.',
    },
  })`}</pre>
            </article>
            <article className="chat-panel">
              <header>render everywhere</header>
              <pre>{`// React
import { AgentChat } from '@agentskit/chat/react'
<AgentChat definition={supportChat(adapter)} />

// Vue
import { AgentChat } from '@agentskit/chat/vue'
<AgentChat :definition="supportChat(adapter)" />

// Ink (terminal)
import { AgentChat } from '@agentskit/chat/ink'
render(<AgentChat definition={supportChat(adapter)} />)`}</pre>
            </article>
          </div>
        </section>

        <section className="chat-section" aria-labelledby="promise-title">
          <h2 id="promise-title">Why teams reach for Chat first</h2>
          <p>
            AI SDK hooks and assistant primitives are excellent for a single UI stack.
            AgentsKit Chat is for the product that must stay coherent when the same agent
            shows up in a dashboard, a mobile app, and a CLI.
          </p>
          <ul className="chat-promise-list">
            {PROMISES.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="chat-section" aria-labelledby="compare-title">
          <h2 id="compare-title">Where it sits in the ecosystem</h2>
          <p>
            Chat does not replace AgentsKit. It composes it into a shippable interactive application
            and keeps every surface on the same protocol.
          </p>
          <div className="chat-panel overflow-x-auto">
            <table className="chat-compare">
              <thead>
                <tr>
                  <th>If you need…</th>
                  <th>Start here</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Adapters, tools, memory, RAG, runtime primitives</td>
                  <td><a href="https://www.agentskit.io/docs">AgentsKit</a></td>
                </tr>
                <tr>
                  <td>One agent UX across web, mobile, and terminal</td>
                  <td><strong>AgentsKit Chat</strong> (you are here)</td>
                </tr>
                <tr>
                  <td>Ready-made agent starting points</td>
                  <td><a href="https://registry.agentskit.io">Registry</a></td>
                </tr>
                <tr>
                  <td>Enterprise orchestration & governance</td>
                  <td><a href="https://akos.agentskit.io">AKOS</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="chat-footer-cta" aria-labelledby="next-title">
          <h2 id="next-title">Build the chat your product actually ships</h2>
          <p>
            Scaffold a renderer, keep one definition, then grow into routes, policy, components,
            sessions, and grounded Ask backends when you need them.
          </p>
          <div className="chat-landing-actions">
            <Link className="chat-landing-cta chat-landing-cta-primary" href="/docs/getting-started">
              Get started
            </Link>
            <Link className="chat-landing-cta chat-landing-cta-secondary" href="/docs/product/positioning">
              Why not AI SDK UI?
            </Link>
            <Link className="chat-landing-cta chat-landing-cta-secondary" href="/docs">
              Documentation home
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
