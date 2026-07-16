'use client'

import { AgentChat } from '@agentskit/chat/react'
import { InputBar } from '@agentskit/react'
import type { ComponentProps } from 'react'
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

const SUGGESTIONS = [
  'Which clients are supported?',
  'How do I install AgentsKit Chat?',
  'Who owns the backend?',
] as const

function AssistantInput({
  chat,
  placeholder,
  disabled,
  seed,
  onSeedConsumed,
}: ComponentProps<typeof InputBar> & {
  readonly seed?: string
  readonly onSeedConsumed?: () => void
}) {
  useEffect(() => {
    if (!seed) return
    const text = seed
    chat.setInput(text)
    const t = window.setTimeout(() => {
      void chat.send(text)
      onSeedConsumed?.()
    }, 30)
    return () => window.clearTimeout(t)
    // Intentionally only react to seed changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  return (
    <InputBar
      chat={chat}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
    />
  )
}

export function DocsAssistant() {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState<string | undefined>()
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    setSeed(undefined)
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
            Ready-to-ship shell on the docs. Exact answers are local; open-ended needs a grounded backend.
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

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-ak-border bg-ak-surface px-2.5 py-1 font-mono text-[11px] text-ak-foam transition hover:border-ak-blue hover:text-ak-blue"
            onClick={() => setSeed(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="docs-assistant-chat overflow-hidden rounded-lg border border-ak-border bg-[#0d1117]">
        <AgentChat
          definition={docsChatDefinition}
          placeholder="Ask about AgentsKit Chat…"
          theme={DARK_THEME}
          slots={{
            Input: (props) => (
              <AssistantInput
                {...props}
                {...(seed !== undefined ? { seed } : {})}
                onSeedConsumed={() => setSeed(undefined)}
              />
            ),
          }}
        />
      </div>
    </aside>
  )
}
