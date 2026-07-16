'use client'

import {
  ApprovalRequestPropsSchema,
  ButtonGroupPropsSchema,
  ChoiceListPropsSchema,
  ConfirmationPropsSchema,
  ErrorNoticePropsSchema,
  FormPropsSchema,
  LinkCardPropsSchema,
  ProgressPropsSchema,
  SourceListPropsSchema,
  StandardComponentCatalog,
  TablePropsSchema,
  ToolCallPropsSchema,
  defineComponentManifest,
  resolveComponentFrame,
  type ComponentDefinition,
} from '@agentskit/chat'
import { StandardComponent, ChoiceList } from '@agentskit/chat/react'
import '@agentskit/react/theme'

const manifest = defineComponentManifest(StandardComponentCatalog)

function frameOf(key: string, props: unknown, instanceId: string) {
  const def = StandardComponentCatalog.find((c) => c.key === key) as ComponentDefinition<unknown> | undefined
  const summary = typeof def?.fallback === 'function' ? def.fallback(props as never) : key
  return {
    protocol: 'agentskit.chat.component' as const,
    version: 1 as const,
    type: 'render' as const,
    componentKey: key,
    instanceId,
    props,
    fallback: { kind: key, summary: String(summary) },
  }
}

const demos: { title: string; key: string; props: unknown }[] = [
  {
    title: 'Choice list',
    key: 'choice-list',
    props: ChoiceListPropsSchema.parse({
      prompt: 'Which surface are you shipping first?',
      choices: [
        { id: 'web', label: 'Web (React/Vue/…)' },
        { id: 'mobile', label: 'Mobile (React Native)' },
        { id: 'cli', label: 'Terminal (Ink)' },
      ],
    }),
  },
  {
    title: 'Button group',
    key: 'button-group',
    props: ButtonGroupPropsSchema.parse({
      label: 'Quick actions',
      buttons: [
        { id: 'docs', label: 'Open docs', variant: 'primary' },
        { id: 'cli', label: 'Copy CLI', variant: 'secondary' },
        { id: 'danger', label: 'Reset', variant: 'danger' },
      ],
    }),
  },
  {
    title: 'Confirmation',
    key: 'confirmation',
    props: ConfirmationPropsSchema.parse({
      title: 'Refund order?',
      message: 'This will refund $84.00 to the original payment method.',
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
    }),
  },
  {
    title: 'Approval request',
    key: 'approval-request',
    props: ApprovalRequestPropsSchema.parse({
      title: 'Run deploy',
      description: 'Promote staging → production for chat-docs.',
      approveLabel: 'Deploy',
      denyLabel: 'Hold',
    }),
  },
  {
    title: 'Progress',
    key: 'progress',
    props: ProgressPropsSchema.parse({ label: 'Indexing corpus', value: 62, status: 'Embedding packs…' }),
  },
  {
    title: 'Source list',
    key: 'source-list',
    props: SourceListPropsSchema.parse({
      label: 'Sources',
      sources: [
        { id: '1', title: 'Getting started', url: '/docs/getting-started', snippet: 'Scaffold a renderer…' },
        { id: '2', title: 'CLI', url: '/docs/cli', snippet: 'init, add component…' },
      ],
    }),
  },
  {
    title: 'Link card',
    key: 'link-card',
    props: LinkCardPropsSchema.parse({
      title: 'Multi-surface quick start',
      description: 'One definition across seven shells.',
      href: '/docs/getting-started',
      label: 'Open guide',
    }),
  },
  {
    title: 'Error notice',
    key: 'error-notice',
    props: ErrorNoticePropsSchema.parse({
      title: 'Provider unavailable',
      message: 'Falling back to the deterministic plane.',
      code: 'AK_PROVIDER_DOWN',
      retryLabel: 'Retry',
    }),
  },
  {
    title: 'Tool call',
    key: 'tool-call',
    props: ToolCallPropsSchema.parse({
      name: 'flights.search',
      status: 'complete',
      arguments: { from: 'LAX', to: 'JFK' },
      result: { count: 3 },
    }),
  },
  {
    title: 'Form',
    key: 'form',
    props: FormPropsSchema.parse({
      title: 'Report an issue',
      submitLabel: 'Submit',
      fields: [
        { id: 'email', label: 'Email', type: 'email', required: true },
        { id: 'detail', label: 'What broke?', type: 'text', required: true },
      ],
    }),
  },
  {
    title: 'Table',
    key: 'table',
    props: TablePropsSchema.parse({
      caption: 'Renderer matrix',
      columns: [
        { key: 'surface', label: 'Surface' },
        { key: 'package', label: 'Package' },
      ],
      rows: [
        { surface: 'React', package: '@agentskit/chat/react' },
        { surface: 'Ink', package: '@agentskit/chat/ink' },
      ],
    }),
  },
]

export function ComponentGallery() {
  return (
    <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
      {demos.map((demo) => {
        const frame = frameOf(demo.key, demo.props, `demo-${demo.key}`)
        const resolved = resolveComponentFrame(frame, manifest)
        return (
          <article
            key={demo.key}
            className="overflow-hidden rounded-xl border border-ak-border bg-[#0d1117] p-4 shadow-lg"
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 className="m-0 font-mono text-sm font-semibold text-ak-foam">{demo.title}</h3>
              <code className="rounded bg-ak-surface px-1.5 py-0.5 font-mono text-[10px] text-ak-blue">{demo.key}</code>
            </header>
            <div
              className="ak-component-demo rounded-lg border border-ak-border/60 bg-ak-surface/40 p-3 text-sm text-ak-foam"
              data-ak-app-chat=""
            >
              {resolved?.ok ? (
                demo.key === 'choice-list' ? (
                  <ChoiceList
                    frame={frame as never}
                    manifest={manifest}
                    onSelect={() => undefined}
                  />
                ) : (
                  <StandardComponent
                    frame={frame as never}
                    manifest={manifest}
                    onInteract={() => undefined}
                  />
                )
              ) : (
                <p className="text-ak-graphite">Unable to resolve component.</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
