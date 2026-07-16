import Link from 'next/link'
import { BrandIcon } from '@/components/brand-icon'

const BRANCHES = [
  { title: 'React', href: '/docs/getting-started/react', meta: '@agentskit/chat/react', detail: 'web apps & design systems', slug: 'react' },
  { title: 'Vue', href: '/docs/getting-started/vue', meta: '@agentskit/chat/vue', detail: 'composition API shells', slug: 'vuedotjs' },
  { title: 'Svelte', href: '/docs/getting-started/svelte', meta: '@agentskit/chat/svelte', detail: 'Svelte 5 native UI', slug: 'svelte' },
  { title: 'Solid', href: '/docs/getting-started/solid', meta: '@agentskit/chat/solid', detail: 'fine-grained reactivity', slug: 'solid' },
  { title: 'Angular', href: '/docs/getting-started/angular', meta: '@agentskit/chat/angular', detail: 'enterprise web', slug: 'angular' },
  { title: 'React Native', href: '/docs/getting-started/react-native', meta: '@agentskit/chat/react-native', detail: 'iOS & Android', slug: 'expo' },
  { title: 'Ink', href: '/docs/getting-started/ink', meta: '@agentskit/chat/ink', detail: 'terminal / TUI', slug: null as string | null },
] as const

const ARC_DESTS = [7.14, 21.43, 35.71, 50, 64.29, 78.57, 92.86]
const arcPath = (y: number) => `M 22 50 C 42 50, 42 ${y}, 64 ${y}`

export function ArchitectureFanout() {
  return (
    <div className="relative mt-4">
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        {ARC_DESTS.map((y, i) => (
          <g key={y}>
            <path
              d={arcPath(y)}
              pathLength={100}
              fill="none"
              stroke="var(--ak-accent)"
              strokeWidth={1}
              strokeOpacity={0.22}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={arcPath(y)}
              pathLength={100}
              fill="none"
              stroke="var(--ak-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="ak-flow-out"
              style={{ animationDelay: `${-Math.floor(i / 2)}s` }}
            />
          </g>
        ))}
      </svg>

      <div className="relative grid gap-8 md:grid-cols-[minmax(0,16rem)_1fr] md:items-stretch md:gap-10">
        <div className="self-center rounded-2xl border border-ak-border bg-ak-surface/70 p-6">
          <div className="font-mono text-sm text-ak-graphite">@agentskit/chat</div>
          <div className="mt-2 font-mono text-3xl font-bold text-ak-foam sm:text-4xl">defineChat</div>
          <p className="mt-4 text-sm leading-relaxed text-ak-graphite">
            Routes, policy, components, sessions — one application signature. AgentsKit owns
            adapters, tools, memory, RAG, and lifecycle.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['protocol', 'server', 'policy', 'components'].map((tag) => (
              <span key={tag} className="rounded-full border border-ak-border px-2.5 py-1 font-mono text-[11px] text-ak-blue">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col justify-between gap-1.5 md:ml-auto md:w-[min(100%,28rem)]">
          {BRANCHES.map((branch) => (
            <li key={branch.title}>
              <Link
                href={branch.href}
                className="group flex items-center gap-2.5 rounded-xl border border-ak-border bg-ak-surface/50 px-3 py-2 transition hover:border-ak-blue/40 hover:bg-ak-surface"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ak-surface transition group-hover:bg-ak-blue/15">
                  <BrandIcon slug={branch.slug} label={branch.title} size={20} imgClass="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-sm font-medium text-ak-foam transition group-hover:text-ak-blue">
                    {branch.title}
                  </span>
                  <span className="block text-[11px] text-ak-graphite">{branch.detail}</span>
                </span>
                <span className="ml-auto hidden text-right font-mono text-[10px] text-ak-graphite sm:inline sm:text-[11px]">
                  {branch.meta}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
