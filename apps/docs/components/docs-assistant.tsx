'use client'

import { AgentChat } from '@agentskit/chat/react'
import { useEffect, useRef, useState } from 'react'
import { docsChatDefinition } from '@/lib/chat-definition'
import '@agentskit/react/theme'

const DARK_THEME = {
  colors: {
    background: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    text: '#e6edf3',
    muted: '#8b949e',
    accent: '#58a6ff',
    onAccent: '#0d1117',
    danger: '#f85149',
  },
} as const

export function DocsAssistant() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }
  if (!open) {
    return (
      <button
        ref={trigger}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-ak-blue px-5 py-3 font-semibold text-ak-midnight shadow-xl shadow-black/40"
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
      >
        Ask the docs
      </button>
    )
  }
  return (
    <aside className="docs-assistant" aria-label="AgentsKit Chat documentation assistant">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <strong className="text-ak-foam">Ask AgentsKit Chat</strong>
          <p className="mt-1 text-xs text-ak-graphite">
            Exact public-doc answers are local. Open-ended questions need a grounded backend.
          </p>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Close documentation assistant"
          className="shrink-0 rounded-md border border-ak-border px-2.5 py-1.5 font-mono text-xs text-ak-foam transition hover:border-ak-blue"
        >
          Close
        </button>
      </header>
      <div className="docs-assistant-chat min-h-[18rem] overflow-hidden rounded-lg border border-ak-border bg-[#0d1117]">
        <AgentChat
          definition={docsChatDefinition}
          placeholder="Ask about AgentsKit Chat…"
          theme={DARK_THEME}
        />
      </div>
      <p className="mt-2 text-[11px] text-ak-graphite">
        Try: <button type="button" className="font-mono text-ak-blue underline-offset-2 hover:underline" onClick={() => { /* user types */ }}>Which clients are supported?</button>
      </p>
    </aside>
  )
}
