import Link from 'next/link'

export default function HomePage() {
  return <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-20">
    <span className="maturity-badge w-fit text-violet-700 dark:text-violet-300">Alpha · framework dogfood</span>
    <div className="max-w-3xl space-y-5">
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">One chat definition. Every AgentsKit client.</h1>
      <p className="text-xl text-fd-muted-foreground">A public, cross-framework application layer for deterministic routes, interactive components, grounded answers, sessions, and host-owned backends.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Link className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700" href="/docs/getting-started">Start building</Link>
      <Link className="rounded-lg border px-5 py-3 font-semibold" href="/docs/releases/stability">See maturity</Link>
    </div>
    <ul className="grid gap-4 pt-6 sm:grid-cols-3">
      <li className="rounded-xl border p-5"><strong>Released</strong><p className="mt-2 text-sm text-fd-muted-foreground">React, React Native, Svelte, Vue, Angular, Solid, Ink, protocol, server, and CLI packages.</p></li>
      <li className="rounded-xl border p-5"><strong>Alpha</strong><p className="mt-2 text-sm text-fd-muted-foreground">This documentation assistant and its full framework dogfood evidence.</p></li>
      <li className="rounded-xl border p-5"><strong>Explicit boundaries</strong><p className="mt-2 text-sm text-fd-muted-foreground">Planned and unavailable capabilities stay visibly labelled.</p></li>
    </ul>
  </main>
}
