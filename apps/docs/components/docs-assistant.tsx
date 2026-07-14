'use client'

import { AgentChat } from '@agentskit/chat-react'
import { useEffect, useRef, useState } from 'react'
import { docsChatDefinition } from '@/lib/chat-definition'

export function DocsAssistant() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) closeButton.current?.focus() }, [open])
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }
  if (!open) return <button ref={trigger} className="fixed bottom-4 right-4 z-50 rounded-full bg-violet-600 px-5 py-3 font-semibold text-white shadow-xl" type="button" onClick={() => setOpen(true)} aria-expanded="false">Ask the docs</button>
  return <aside className="docs-assistant" aria-label="AgentsKit Chat documentation assistant">
    <header className="mb-3 flex items-start justify-between gap-4">
      <div><strong>Ask AgentsKit Chat</strong><p className="text-xs text-fd-muted-foreground">Exact public-doc answers are local. Open-ended questions require a configured grounded backend.</p></div>
      <button ref={closeButton} type="button" onClick={close} aria-label="Close documentation assistant">Close</button>
    </header>
    <AgentChat definition={docsChatDefinition} placeholder="Ask about AgentsKit Chat…" />
  </aside>
}
