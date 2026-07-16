const BRANCHES = [
  { title: 'React', detail: 'web apps & design systems' },
  { title: 'Vue', detail: 'composition API shells' },
  { title: 'Svelte', detail: 'Svelte 5 native UI' },
  { title: 'Solid', detail: 'fine-grained reactivity' },
  { title: 'Angular', detail: 'enterprise web' },
  { title: 'React Native', detail: 'iOS & Android' },
  { title: 'Ink', detail: 'terminal / TUI' },
] as const

export function ArchitectureFanout() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-ak-border bg-ak-surface p-5 shadow-xl">
        <div className="mb-3 font-mono text-xs text-ak-graphite">@agentskit/chat</div>
        <div className="text-3xl font-bold tracking-tight text-ak-foam sm:text-4xl">defineChat</div>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ak-graphite">
          Routes, policy, components, sessions — one application signature. AgentsKit owns adapters,
          tools, memory, RAG, and lifecycle.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['protocol', 'server', 'policy', 'components'].map((tag) => (
            <span key={tag} className="rounded-full border border-ak-border px-2.5 py-1 font-mono text-[11px] text-ak-blue">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-3 left-0 hidden w-8 lg:block" aria-hidden>
          <svg viewBox="0 0 40 280" className="h-full w-full text-ak-green/50">
            {BRANCHES.map((_, i) => {
              const y = 20 + i * 36
              return <path key={i} d={`M0,140 C18,140 18,${y} 40,${y}`} fill="none" stroke="currentColor" strokeWidth="1.5" />
            })}
          </svg>
        </div>
        <ul className="flex flex-col gap-2 lg:pl-10">
          {BRANCHES.map((branch) => (
            <li
              key={branch.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-ak-border bg-ak-surface/80 px-3.5 py-2.5 transition hover:border-ak-blue/50"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ak-blue/10 font-mono text-xs font-bold text-ak-blue">
                  {branch.title.slice(0, 2)}
                </span>
                <div>
                  <div className="font-mono text-sm font-semibold text-ak-foam">{branch.title}</div>
                  <div className="text-xs text-ak-graphite">{branch.detail}</div>
                </div>
              </div>
              <span className="hidden font-mono text-[11px] text-ak-graphite sm:inline">@agentskit/chat/{branch.title === 'React Native' ? 'react-native' : branch.title.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
