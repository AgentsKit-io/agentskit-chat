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
    <article className="overflow-hidden rounded-xl border border-ak-border bg-[#0d1117] shadow-xl">
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
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 sm:text-[13px]">
        <code>
          {lines.map((line, i) => (
            <div key={i} style={{ paddingLeft: `${(line.indent ?? 0) * 1.1}rem` }}>
              {line.tokens.map((tok, j) => (
                <span key={j} className={`${tok.tone ? TONE[tok.tone] : 'text-[#e6edf3]'} bg-transparent`}>
                  {tok.text}
                </span>
              ))}
              {'\n'}
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

export const RENDER_EVERYWHERE_LINES: Line[] = [
  { tokens: [{ text: '// React', tone: 'comment' }] },
  { tokens: [{ text: 'import ', tone: 'kw' }, { text: '{ AgentChat }', tone: 'prop' }, { text: ' from ', tone: 'kw' }, { text: "'@agentskit/chat/react'", tone: 'str' }] },
  { tokens: [{ text: '<', tone: 'punct' }, { text: 'AgentChat', tone: 'fn' }, { text: ' definition', tone: 'prop' }, { text: '={supportChat(adapter)} />', tone: 'punct' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: '// Vue', tone: 'comment' }] },
  { tokens: [{ text: 'import ', tone: 'kw' }, { text: '{ AgentChat }', tone: 'prop' }, { text: ' from ', tone: 'kw' }, { text: "'@agentskit/chat/vue'", tone: 'str' }] },
  { tokens: [{ text: '<', tone: 'punct' }, { text: 'AgentChat', tone: 'fn' }, { text: ' :definition', tone: 'prop' }, { text: '="supportChat(adapter)" />', tone: 'punct' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: '// Ink (terminal)', tone: 'comment' }] },
  { tokens: [{ text: 'import ', tone: 'kw' }, { text: '{ AgentChat }', tone: 'prop' }, { text: ' from ', tone: 'kw' }, { text: "'@agentskit/chat/ink'", tone: 'str' }] },
  { tokens: [{ text: 'render', tone: 'fn' }, { text: '(<', tone: 'punct' }, { text: 'AgentChat', tone: 'fn' }, { text: ' definition', tone: 'prop' }, { text: '={supportChat(adapter)} />)', tone: 'punct' }] },
]
