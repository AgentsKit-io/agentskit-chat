'use client'

import { defineChat } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat/react'
import { buildMessage } from '@agentskit/core'
import { useMemo } from 'react'
import { createMockAdapter } from './mock-adapter'
import '@agentskit/react/theme'

const RESPONSES = [
  'Streaming works by sending tokens incrementally — AgentsKit flushes chunks so the UI stays responsive.',
  'defineChat keeps one application signature. React, Vue, and Ink shells all consume the same definition.',
  'Tools, confirmation, and sessions stay on the AgentsKit substrate. Chat owns routes, policy, and components.',
]

export function BasicChatExample() {
  const definition = useMemo(
    () =>
      defineChat({
        id: 'docs-basic-example',
        chat: {
          adapter: createMockAdapter(RESPONSES),
          initialMessages: [
            buildMessage({
              role: 'assistant',
              content:
                "Hi — this is a live AgentsKit Chat shell. Ask anything about multi-surface chat.",
              status: 'complete',
            }),
          ],
        },
      }),
    [],
  )

  return (
    <div
      data-ak-example
      className="not-prose my-4 flex h-[420px] flex-col overflow-hidden rounded-xl border border-ak-border bg-[#0d1117] shadow-xl"
    >
      <AgentChat
        definition={definition}
        placeholder="Try: how does multi-surface chat work?"
        theme={{
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
        }}
      />
    </div>
  )
}
