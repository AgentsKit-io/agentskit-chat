'use client'

import {
  StandardComponentCatalog,
  defineComponentManifest,
  resolveComponentFrame,
  type ComponentDefinition,
} from '@agentskit/chat'
import { standardComponentFrameFixtures } from '@agentskit/chat/protocol/fixtures'
import { ChoiceList, StandardComponent } from '@agentskit/chat/react'
import Link from 'next/link'
import '@agentskit/react/theme'

const manifest = defineComponentManifest(StandardComponentCatalog)

export type CatalogKey = (typeof StandardComponentCatalog)[number]['key']

const META: Record<
  string,
  { title: string; summary: string; when: string; href: string }
> = {
  'button-group': {
    title: 'Button group',
    summary: 'A labelled set of action buttons the model may offer.',
    when: 'Quick actions with one selection (save, cancel, open…).',
    href: '/docs/components/button-group',
  },
  'choice-list': {
    title: 'Choice list',
    summary: 'Prompt + 1–20 choices with optional descriptions and typed actions.',
    when: 'Branching UX, onboarding, pick-one flows across every shell.',
    href: '/docs/components/choice-list',
  },
  form: {
    title: 'Form',
    summary: 'Schema-backed fields with a single submit event.',
    when: 'Collect structured input (email, text, select, checkbox, number).',
    href: '/docs/components/form',
  },
  confirmation: {
    title: 'Confirmation',
    summary: 'Confirm / cancel pair for a destructive or sensitive step.',
    when: 'Delete, overwrite, or any binary human gate without a full tool call.',
    href: '/docs/components/confirmation',
  },
  progress: {
    title: 'Progress',
    summary: 'Percent progress with optional status text.',
    when: 'Long-running work the user should see without polling another UI.',
    href: '/docs/components/progress',
  },
  'source-list': {
    title: 'Source list',
    summary: 'Cited sources with optional URLs and snippets.',
    when: 'RAG / docs answers that must show where claims came from.',
    href: '/docs/components/source-list',
  },
  'link-card': {
    title: 'Link card',
    summary: 'Title, description, and href as a single navigation affordance.',
    when: 'Deep-link to docs, tickets, or external resources.',
    href: '/docs/components/link-card',
  },
  'error-notice': {
    title: 'Error notice',
    summary: 'Accessible alert with optional retry.',
    when: 'Surface recoverable failures without crashing the shell.',
    href: '/docs/components/error-notice',
  },
  'tool-call': {
    title: 'Tool call',
    summary: 'Status display for a tool invocation (pending → complete/error).',
    when: 'Show what the agent is doing without inventing a custom panel.',
    href: '/docs/components/tool-call',
  },
  'approval-request': {
    title: 'Approval request',
    summary: 'Approve / deny for a proposed side effect.',
    when: 'Human-in-the-loop gates for tools that require confirmation.',
    href: '/docs/components/approval-request',
  },
  table: {
    title: 'Table',
    summary: 'Captioned columns and rows of scalar cells.',
    when: 'Compare options, list records, or show structured results.',
    href: '/docs/components/table',
  },
  'file-attachment': {
    title: 'File attachment',
    summary: 'Named file with mime type, size, and optional open URL.',
    when: 'Surface downloads or generated artifacts in the transcript.',
    href: '/docs/components/file-attachment',
  },
}

function frameFor(key: string) {
  const fixture = standardComponentFrameFixtures.find((f) => f.componentKey === key)
  const def = StandardComponentCatalog.find((c) => c.key === key) as ComponentDefinition<unknown> | undefined
  const props = fixture?.props ?? {}
  const summary =
    typeof def?.fallback === 'function' ? def.fallback(props as never) : key
  return {
    protocol: 'agentskit.chat.component' as const,
    version: 1 as const,
    type: 'render' as const,
    componentKey: key,
    instanceId: `docs-${key}`,
    props,
    fallback: { kind: key, summary: String(summary) },
  }
}

/** Single-component live preview for per-component docs pages. */
export function ComponentDemo({ componentKey }: { readonly componentKey: string }) {
  const frame = frameFor(componentKey)
  const resolved = resolveComponentFrame(frame, manifest)
  const meta = META[componentKey]

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-ak-border bg-[#0d1117] shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ak-border px-4 py-3">
        <div>
          <div className="font-mono text-sm font-semibold text-ak-foam">{meta?.title ?? componentKey}</div>
          <div className="mt-0.5 font-mono text-[11px] text-ak-graphite">{meta?.summary}</div>
        </div>
        <code className="rounded-md bg-ak-surface px-2 py-1 font-mono text-[11px] text-ak-blue">{componentKey}</code>
      </div>
      <div className="ak-component-demo p-5" data-ak-app-chat="">
        {resolved?.ok ? (
          componentKey === 'choice-list' ? (
            <ChoiceList frame={frame as never} manifest={manifest} onSelect={() => undefined} />
          ) : (
            <StandardComponent frame={frame as never} manifest={manifest} onInteract={() => undefined} />
          )
        ) : (
          <p className="text-sm text-ak-graphite">Unable to resolve component frame.</p>
        )}
      </div>
    </div>
  )
}

/** Compact index cards linking to each component page (no giant live dump). */
export function ComponentIndex() {
  return (
    <div className="not-prose my-6 grid gap-3 sm:grid-cols-2">
      {StandardComponentCatalog.map((def) => {
        const meta = META[def.key]
        const events = (def.events ?? []).map((e) => e.name).join(', ') || '—'
        return (
          <Link
            key={def.key}
            href={meta?.href ?? `/docs/components/${def.key}`}
            className="group rounded-2xl border border-ak-border bg-ak-surface/40 p-4 transition hover:border-ak-blue/50 hover:bg-ak-surface"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="m-0 font-mono text-sm font-semibold text-ak-foam group-hover:text-ak-blue">
                {meta?.title ?? def.key}
              </h3>
              <code className="shrink-0 rounded bg-[#0d1117] px-1.5 py-0.5 font-mono text-[10px] text-ak-blue">
                {def.key}
              </code>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ak-graphite">{meta?.when}</p>
            <p className="mt-2 font-mono text-[10px] text-ak-graphite/80">events: {events}</p>
          </Link>
        )
      })}
    </div>
  )
}

/** Full gallery of live previews — for examples page only (not catalog index). */
export function ComponentGallery() {
  return (
    <div className="not-prose my-6 space-y-4">
      <p className="m-0 text-sm leading-relaxed text-ak-graphite">
        Live lab ({StandardComponentCatalog.length} keys). Docs host CSS only — package primitives are
        unstyled by design. Props, frames, and agent notes live on each full page.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {StandardComponentCatalog.map((def) => (
          <div key={def.key} id={`component-${def.key}`}>
            <ComponentDemo componentKey={def.key} />
            <div className="mt-2 text-right">
              <Link
                href={META[def.key]?.href ?? `/docs/components/${def.key}`}
                className="font-mono text-xs text-ak-blue hover:underline"
              >
                Props, frame & agents →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { META as COMPONENT_META }
