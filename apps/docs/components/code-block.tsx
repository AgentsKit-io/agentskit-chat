'use client'

import { isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { Mermaid } from '@/components/mermaid'

const MERMAID_START =
  /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap|timeline|journey|gitGraph|C4Context|quadrantChart|requirementDiagram|sankey-beta|xychart-beta)\b/m

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

type PreProps = React.ComponentProps<'pre'> & {
  readonly 'data-language'?: string
  readonly 'data-theme'?: string
}

/** Pre wrapper for MDX/Shiki fenced blocks. Mermaid fences render as diagrams. */
export function Pre(props: PreProps) {
  const [copied, setCopied] = useState(false)
  const text = extractText(props.children).replace(/\n$/, '')
  const lang = detectLanguage(props, text)

  if (lang === 'mermaid' || isMermaidChart(text)) {
    return (
      <div className="not-prose my-4 overflow-x-auto rounded-xl border border-ak-border bg-[#0d1117] p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ak-graphite">diagram</div>
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

function detectLanguage(props: PreProps, text: string): string {
  const direct = props['data-language']
  if (typeof direct === 'string' && direct.trim()) return direct.trim().toLowerCase()

  const fromClass = languageFromClassName(props.className)
  if (fromClass) return fromClass

  const fromChild = languageFromChildren(props.children)
  if (fromChild) return fromChild

  if (isMermaidChart(text)) return 'mermaid'
  return ''
}

function languageFromClassName(className: unknown): string {
  if (typeof className !== 'string') return ''
  const match =
    className.match(/(?:^|\s)language-([\w-]+)(?:\s|$)/) ??
    className.match(/(?:^|\s)lang-([\w-]+)(?:\s|$)/)
  return match?.[1]?.toLowerCase() ?? ''
}

function languageFromChildren(node: ReactNode): string {
  if (!isValidElement(node)) {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = languageFromChildren(child)
        if (found) return found
      }
    }
    return ''
  }
  const el = node as ReactElement<{ className?: string; 'data-language'?: string; children?: ReactNode }>
  const dataLang = el.props['data-language']
  if (typeof dataLang === 'string' && dataLang.trim()) return dataLang.trim().toLowerCase()
  const fromClass = languageFromClassName(el.props.className)
  if (fromClass) return fromClass
  return languageFromChildren(el.props.children)
}

function isMermaidChart(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  // Allow leading whitespace on the first keyword line (Shiki / pretty-code).
  return (
    MERMAID_START.test(trimmed) ||
    /^\s*(?:flowchart|graph|sequenceDiagram)\b/m.test(trimmed)
  )
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>
    return extractText(el.props.children)
  }
  return ''
}
