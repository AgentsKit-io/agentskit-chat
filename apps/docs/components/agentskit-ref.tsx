import { agentskitDocs, ecosystem } from '@/lib/ecosystem'

/** Inline AgentsKit reference with live ecosystem counts (not hardcoded prose). */
export function AgentsKitRef({
  of = 'home',
}: {
  readonly of?: keyof typeof agentskitDocs
}) {
  const href = agentskitDocs[of] ?? agentskitDocs.home
  return (
    <a href={href} className="font-medium text-ak-blue underline-offset-2 hover:underline" rel="noreferrer" target="_blank">
      AgentsKit
    </a>
  )
}

export function AdaptersCallout() {
  return (
    <p className="not-prose rounded-xl border border-ak-border bg-ak-surface/50 px-4 py-3 text-sm leading-relaxed text-ak-graphite">
      <strong className="text-ak-foam">Adapters</strong> come from{' '}
      <a className="text-ak-blue hover:underline" href={agentskitDocs.adapters} target="_blank" rel="noreferrer">
        AgentsKit providers
      </a>
      : currently <strong className="text-ak-foam">{ecosystem.nativeAdapters}</strong> native adapters spanning{' '}
      <strong className="text-ak-foam">{ecosystem.catalogProviders}+</strong> catalog providers and{' '}
      <strong className="text-ak-foam">{Math.floor(ecosystem.catalogModels / 1000)}k+</strong> models — Chat does not reimplement them.
    </p>
  )
}

export function EcosystemStrip() {
  return (
    <div className="not-prose my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Adapters', value: ecosystem.nativeAdapters, href: agentskitDocs.adapters },
        { label: 'Providers', value: `${ecosystem.catalogProviders}+`, href: agentskitDocs.adapters },
        { label: 'Integrations', value: `${ecosystem.integrations}+`, href: agentskitDocs.tools },
        { label: 'UI bindings', value: ecosystem.frameworkBindings, href: agentskitDocs.react },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-ak-border bg-ak-surface/40 px-3 py-2.5 transition hover:border-ak-blue/50"
        >
          <div className="font-mono text-lg font-bold text-ak-foam">{item.value}</div>
          <div className="font-mono text-[11px] text-ak-graphite">{item.label} ↗</div>
        </a>
      ))}
    </div>
  )
}
