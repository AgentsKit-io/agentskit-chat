const FRAMEWORKS = [
  { id: 'react', label: 'React', mark: '⚛' },
  { id: 'vue', label: 'Vue', mark: 'V' },
  { id: 'svelte', label: 'Svelte', mark: 'S' },
  { id: 'solid', label: 'Solid', mark: '◆' },
  { id: 'angular', label: 'Angular', mark: 'A' },
  { id: 'rn', label: 'React Native', mark: 'RN' },
  { id: 'ink', label: 'Ink', mark: '>_', mono: true },
  { id: 'js', label: 'TypeScript', mark: 'TS' },
] as const

export function WorksWithLogos() {
  return (
    <section className="border-y border-ak-border bg-ak-midnight px-4 py-10 sm:px-6" aria-label="Works with">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ak-graphite">
          Works with
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8">
          {FRAMEWORKS.map((fw) => (
            <li key={fw.id} className="flex items-center gap-2 text-ak-foam/90">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ak-border bg-ak-surface text-sm font-bold ${
                  'mono' in fw && fw.mono ? 'font-mono text-xs' : ''
                }`}
                aria-hidden
              >
                {fw.mark}
              </span>
              <span className="sr-only sm:not-sr-only sm:font-mono sm:text-xs sm:text-ak-graphite">{fw.label}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-xl text-center text-sm text-ak-graphite">
          One <span className="font-mono text-ak-foam">ChatDefinition</span>. Native shells on every AgentsKit UI binding —
          web, mobile, and terminal.
        </p>
      </div>
    </section>
  )
}
