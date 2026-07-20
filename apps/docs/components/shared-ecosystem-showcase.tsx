import { createElement } from 'react'

export function SharedEcosystemShowcase() {
  return createElement(
    'agentskit-ecosystem',
    { current: 'agentskit-chat', className: 'not-prose block' },
    <section className="border-y border-ak-border bg-ak-midnight px-5 py-16 text-ak-foam">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ak-graphite">The AgentsKit ecosystem</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Build the agent. Then take it all the way.
        </h2>
        <p className="mt-4 max-w-2xl text-ak-graphite">
          One connected toolkit from ready-made source to governed production.
        </p>
      </div>
    </section>,
  )
}
