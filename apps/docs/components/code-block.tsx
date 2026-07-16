'use client'

import { useState, type ReactNode } from 'react'
import { Mermaid } from '@/components/mermaid'

export function CodeBlock({
  title,
  children,
  code,
}: {
  readonly title?: string
  readonly children: ReactNode
  readonly code?: string
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const text = code ?? (typeof children === 'string' ? children : '')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div data-ak-code-block className="not-prose my-4 overflow-hidden rounded-xl border border-ak-border bg-ak-surface">
      <div className="flex items-center justify-between gap-2 border-b border-ak-border px-3 py-2">
        <span className="truncate font-mono text-[11px] text-ak-graphite">{title ?? 'code'}</span>
        {code ? (
          <button
            type="button"
            onClick={() => void onCopy()}
            className="rounded-md border border-ak-border px-2 py-1 font-mono text-[11px] text-ak-foam transition hover:border-ak-blue hover:text-ak-blue"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto p-0 [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-4 [&_code]:bg-transparent! [&_span]:bg-transparent!">
        {children}
      </div>
    </div>
  )
}

/** Pre wrapper for MDX fenced blocks — fumadocs may pass props differently. */
export function Pre(props: React.ComponentProps<'pre'> & { 'data-language'?: string }) {
  const [copied, setCopied] = useState(false)
  const text = extractText(props.children)
  const lang = props['data-language'] ?? ''

  if (lang === 'mermaid') {
    return (
      <div className="not-prose my-4 overflow-x-auto rounded-xl border border-ak-border bg-[#0d1117] p-4">
        <Mermaid chart={text} />
      </div>
    )
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div data-ak-code-block className="not-prose group relative my-4 overflow-hidden rounded-xl border border-ak-border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-ak-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ak-graphite">
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded-md border border-ak-border px-2 py-0.5 font-mono text-[11px] text-ak-graphite transition hover:text-ak-foam"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        {...props}
        className={`m-0 overflow-x-auto bg-transparent p-4 text-[13px] leading-relaxed ${props.className ?? ''}`}
      />
    </div>
  )
}

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    const el = node as { props?: { children?: React.ReactNode } }
    return extractText(el.props?.children)
  }
  return ''
}
