import { BrandIcon } from '@/components/brand-icon'

const FRAMEWORKS = [
  { slug: 'react', label: 'React' },
  { slug: 'vuedotjs', label: 'Vue' },
  { slug: 'svelte', label: 'Svelte' },
  { slug: 'solid', label: 'Solid' },
  { slug: 'angular', label: 'Angular' },
  { slug: 'expo', label: 'React Native' },
  { slug: null as string | null, label: 'Ink' },
  { slug: 'typescript', label: 'TypeScript' },
]

/** Quiet static proof — matches agentskit.io hero "Works with" treatment. */
export function WorksWithLogos() {
  return (
    <section className="border-y border-ak-border bg-ak-midnight px-4 py-12 sm:px-6" aria-label="Works with">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ak-graphite/70">
            Works with
          </span>
          {FRAMEWORKS.map((fw) => (
            <span key={fw.label} className="inline-flex items-center gap-2" title={fw.label}>
              <BrandIcon
                slug={fw.slug}
                label={fw.label}
                size={22}
                imgClass="h-[22px] w-[22px] opacity-90"
              />
              <span className="sr-only">{fw.label}</span>
            </span>
          ))}
        </div>
        <p className="max-w-xl text-center text-sm text-ak-graphite">
          One <span className="font-mono text-ak-foam">ChatDefinition</span>. Native shells on every
          AgentsKit UI binding — web, mobile, and terminal.
        </p>
      </div>
    </section>
  )
}
