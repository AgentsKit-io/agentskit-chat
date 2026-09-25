'use client'

import { useMemo, useState } from 'react'

type Token = { readonly text: string; readonly tone?: 'kw' | 'str' | 'fn' | 'prop' | 'punct' | 'type' | 'comment' }

type Line = { readonly tokens: readonly Token[]; readonly indent?: number }

const TONE: Record<NonNullable<Token['tone']>, string> = {
  kw: 'text-[#79c0ff]',
  str: 'text-[#a5d6ff]',
  fn: 'text-[#d2a8ff]',
  prop: 'text-[#e6edf3]',
  punct: 'text-[#8b949e]',
  type: 'text-[#ffa657]',
  comment: 'text-[#8b949e]',
}

export function HighlightedCode({
  title,
  lines,
}: {
  readonly title: string
  readonly lines: readonly Line[]
}) {
  const [copied, setCopied] = useState(false)
  const plain = useMemo(
    () =>
      lines
        .map((line) => `${'  '.repeat(line.indent ?? 0)}${line.tokens.map((t) => t.text).join('')}`)
        .join('\n'),
    [lines],
  )

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(plain)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-xl border border-ak-border bg-[#0d1117] shadow-xl">
      <header className="flex items-center justify-between border-b border-ak-border px-4 py-2.5">
        <span className="font-mono text-xs text-ak-graphite">{title}</span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded-md border border-ak-border px-2 py-1 font-mono text-[11px] text-ak-graphite transition hover:text-ak-foam"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </header>
      <pre tabIndex={0} className="min-h-48 overflow-x-auto p-4 font-mono text-[12.5px] leading-6 sm:text-[13px]">
        <code>
          {lines.map((line, i) => (
            <div key={i} style={{ paddingLeft: `${(line.indent ?? 0) * 1.1}rem` }}>
              {line.tokens.map((tok, j) => (
                <span key={j} className={`${tok.tone ? TONE[tok.tone] : 'text-[#e6edf3]'} bg-transparent`}>
                  {tok.text}
                </span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </article>
  )
}

export const DEFINE_ONCE_LINES: Line[] = [
  { tokens: [{ text: 'import ', tone: 'kw' }, { text: '{ defineChat }', tone: 'prop' }, { text: ' from ', tone: 'kw' }, { text: "'@agentskit/chat'", tone: 'str' }] },
  { tokens: [{ text: 'import type ', tone: 'kw' }, { text: '{ AdapterFactory }', tone: 'type' }, { text: ' from ', tone: 'kw' }, { text: "'@agentskit/core'", tone: 'str' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: 'export const ', tone: 'kw' }, { text: 'supportChat', tone: 'prop' }, { text: ' = (', tone: 'punct' }, { text: 'adapter', tone: 'prop' }, { text: ': ', tone: 'punct' }, { text: 'AdapterFactory', tone: 'type' }, { text: ') =>', tone: 'punct' }] },
  { indent: 1, tokens: [{ text: 'defineChat', tone: 'fn' }, { text: '({', tone: 'punct' }] },
  { indent: 2, tokens: [{ text: 'id', tone: 'prop' }, { text: ': ', tone: 'punct' }, { text: "'support'", tone: 'str' }, { text: ',', tone: 'punct' }] },
  { indent: 2, tokens: [{ text: 'chat', tone: 'prop' }, { text: ': {', tone: 'punct' }] },
  { indent: 3, tokens: [{ text: 'adapter', tone: 'prop' }, { text: ',', tone: 'punct' }] },
  { indent: 3, tokens: [{ text: 'systemPrompt', tone: 'prop' }, { text: ': ', tone: 'punct' }, { text: "'Help users ship faster.'", tone: 'str' }, { text: ',', tone: 'punct' }] },
  { indent: 2, tokens: [{ text: '},', tone: 'punct' }] },
  { indent: 1, tokens: [{ text: '})', tone: 'punct' }] },
]

const snippet = (lines: readonly string[]): Line[] => lines.map((text) => ({
  tokens: text.split(/('[^']*'|"[^"]*"|\b(?:import|from|class|readonly|render)\b|<\/?[\w.-]+|\/?>|\b(?:AgentChat\w*|chat|definition|imports|template|Component)\b)/g)
    .filter(Boolean)
    .map((part) => {
      const tone = /^['"]/.test(part)
        ? 'str'
        : /^(import|from|class|readonly|render)$/.test(part)
          ? 'kw'
          : /^<\/?/.test(part)
            ? 'fn'
            : /^(AgentChat\w*|Component)$/.test(part)
              ? 'type'
              : /^(chat|definition|imports|template)$/.test(part)
                ? 'prop'
                : undefined
      return { text: part, ...(tone ? { tone } : {}) }
    }),
}))

export const RENDERER_EXAMPLES = [
  { id: 'react', label: 'React', lines: snippet(["import { AgentChat } from '@agentskit/chat/react'", "import { chat } from './chat'", '', '<AgentChat definition={chat} />']) },
  { id: 'vue', label: 'Vue', lines: snippet(["import { AgentChat } from '@agentskit/chat/vue'", "import { chat } from './chat'", '', '<AgentChat :definition="chat" />']) },
  { id: 'svelte', label: 'Svelte', lines: snippet(["import { AgentChat } from '@agentskit/chat/svelte'", "import { chat } from './chat'", '', '<AgentChat definition={chat} />']) },
  { id: 'solid', label: 'Solid', lines: snippet(["import { AgentChat } from '@agentskit/chat/solid'", "import { chat } from './chat'", '', '<AgentChat definition={chat} />']) },
  { id: 'angular', label: 'Angular', lines: snippet(["import { Component } from '@angular/core'", "import { AgentChatComponent } from '@agentskit/chat/angular'", "import { chat } from './chat'", '', "@Component({ imports: [AgentChatComponent], template: '<ak-agent-chat [definition]=\"chat\" />' })", 'class AppComponent { readonly chat = chat }']) },
  { id: 'react-native', label: 'React Native', lines: snippet(["import { AgentChatNative } from '@agentskit/chat/react-native'", "import { chat } from './chat'", '', '<AgentChatNative definition={chat} />']) },
  { id: 'ink', label: 'Ink', lines: snippet(["import { render } from 'ink'", "import { AgentChat } from '@agentskit/chat/ink'", "import { chat } from './chat'", '', 'render(<AgentChat definition={chat} />)']) },
] as const
