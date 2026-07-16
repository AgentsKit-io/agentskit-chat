'use client'

import { useState } from 'react'

const RENDERERS = [
  { id: 'react', label: 'React', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer react --yes' },
  { id: 'vue', label: 'Vue', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer vue --yes' },
  { id: 'svelte', label: 'Svelte', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer svelte --yes' },
  { id: 'solid', label: 'Solid', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer solid --yes' },
  { id: 'angular', label: 'Angular', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer angular --yes' },
  { id: 'react-native', label: 'RN', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer react-native --yes' },
  { id: 'ink', label: 'Ink', command: 'pnpm dlx @agentskit/chat-cli@0.4.0 init my-chat --renderer ink --yes' },
] as const

export function InstallCommand({ defaultRenderer = 'react' }: { readonly defaultRenderer?: string }) {
  const initial = RENDERERS.find((item) => item.id === defaultRenderer) ?? RENDERERS[0]
  const [active, setActive] = useState(initial.id)
  const [copied, setCopied] = useState(false)
  const current = RENDERERS.find((item) => item.id === active) ?? RENDERERS[0]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
      <div
        role="tablist"
        aria-label="Choose a renderer"
        className="flex flex-wrap gap-1 border-b border-fd-border bg-fd-secondary/40 p-2"
      >
        {RENDERERS.map((renderer) => (
          <button
            key={renderer.id}
            type="button"
            role="tab"
            aria-selected={renderer.id === active}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              renderer.id === active
                ? 'bg-fd-background text-fd-foreground shadow-sm'
                : 'text-fd-muted-foreground hover:bg-fd-background/70 hover:text-fd-foreground'
            }`}
            onClick={() => setActive(renderer.id)}
          >
            {renderer.label}
          </button>
        ))}
      </div>
      <div className="flex items-stretch gap-2 p-3">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-fd-secondary/50 px-3 py-2.5 font-mono text-[0.8rem] leading-relaxed text-fd-foreground">
          {current.command}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-xs font-semibold text-fd-foreground transition-colors hover:bg-fd-accent"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
