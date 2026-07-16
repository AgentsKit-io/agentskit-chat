import Link from 'next/link'

const SURFACES = [
  { name: 'React', href: '/docs/getting-started/react', blurb: 'Web apps & design systems' },
  { name: 'Vue', href: '/docs/getting-started/vue', blurb: 'Composition API shells' },
  { name: 'Svelte', href: '/docs/getting-started/svelte', blurb: 'Svelte 5 runes UI' },
  { name: 'Solid', href: '/docs/getting-started/solid', blurb: 'Fine-grained reactivity' },
  { name: 'Angular', href: '/docs/getting-started/angular', blurb: 'Enterprise web shells' },
  { name: 'React Native', href: '/docs/getting-started/react-native', blurb: 'iOS & Android' },
  { name: 'Ink', href: '/docs/getting-started/ink', blurb: 'Terminal / TUI' },
] as const

export function SurfaceGrid({ compact = false }: { readonly compact?: boolean }) {
  return (
    <div className={`not-prose grid gap-2 ${compact ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
      {SURFACES.map((surface) => (
        <Link
          key={surface.name}
          href={surface.href}
          className="rounded-xl border border-fd-border bg-fd-card px-3.5 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--ak-brand)_45%,var(--color-fd-border))] hover:bg-fd-accent/30"
        >
          <strong className="block text-sm font-semibold text-fd-foreground">{surface.name}</strong>
          <span className="mt-0.5 block text-xs leading-snug text-fd-muted-foreground">{surface.blurb}</span>
        </Link>
      ))}
    </div>
  )
}
