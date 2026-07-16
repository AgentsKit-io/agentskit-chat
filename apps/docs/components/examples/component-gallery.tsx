'use client'

import {
  FileAttachmentPropsSchema,
  StandardComponentCatalog,
  defineComponentManifest,
  resolveComponentFrame,
  type ComponentDefinition,
} from '@agentskit/chat'
import { standardComponentFrameFixtures } from '@agentskit/chat/protocol/fixtures'
import { ChoiceList, StandardComponent } from '@agentskit/chat/react'
import '@agentskit/react/theme'

const manifest = defineComponentManifest(StandardComponentCatalog)

/** Prefer protocol fixtures (canonical props) so the gallery always covers the full catalog. */
function demosFromCatalog() {
  const byKey = new Map<string, (typeof standardComponentFrameFixtures)[number]>()
  for (const frame of standardComponentFrameFixtures) {
    byKey.set(frame.componentKey, frame)
  }
  // Ensure file-attachment exists even if fixtures order changes
  if (!byKey.has('file-attachment')) {
    byKey.set(
      'file-attachment',
      {
        protocol: 'agentskit.chat.component',
        version: 1,
        type: 'render',
        componentKey: 'file-attachment',
        instanceId: 'file-attachment-demo',
        props: FileAttachmentPropsSchema.parse({
          name: 'spec.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 48_128,
          url: 'https://www.agentskit.io/docs',
        }),
        fallback: { kind: 'file-attachment', summary: 'Attached spec.pdf' },
      } as (typeof standardComponentFrameFixtures)[number],
    )
  }
  return StandardComponentCatalog.map((def) => {
    const fixture = byKey.get(def.key)
    const props = fixture?.props ?? {}
    const summary =
      typeof (def as ComponentDefinition<unknown>).fallback === 'function'
        ? (def as ComponentDefinition<unknown>).fallback!(props as never)
        : def.key
    return {
      title: titleCase(def.key),
      key: def.key,
      events: (def.events ?? []).map((e) => e.name).join(', ') || '—',
      capabilities: (def.capabilities ?? []).join(' · '),
      frame: {
        protocol: 'agentskit.chat.component' as const,
        version: 1 as const,
        type: 'render' as const,
        componentKey: def.key,
        instanceId: `demo-${def.key}`,
        props,
        fallback: { kind: def.key, summary: String(summary) },
      },
    }
  })
}

function titleCase(key: string) {
  return key
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

export function ComponentGallery() {
  const demos = demosFromCatalog()
  return (
    <div className="not-prose my-6 space-y-4">
      <p className="m-0 text-sm text-ak-graphite">
        Full closed catalog ({demos.length} components). Keys a model may propose; unknown keys stay inert.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {demos.map((demo) => {
          const resolved = resolveComponentFrame(demo.frame, manifest)
          return (
            <article
              key={demo.key}
              className="overflow-hidden rounded-xl border border-ak-border bg-[#0d1117] p-4 shadow-lg"
              id={`component-${demo.key}`}
            >
              <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 font-mono text-sm font-semibold text-ak-foam">{demo.title}</h3>
                <code className="rounded bg-ak-surface px-1.5 py-0.5 font-mono text-[10px] text-ak-blue">{demo.key}</code>
              </header>
              <p className="mb-3 font-mono text-[10px] text-ak-graphite">
                events: {demo.events} · {demo.capabilities}
              </p>
              <div
                className="ak-component-demo rounded-lg border border-ak-border/60 bg-ak-surface/40 p-3 text-sm text-ak-foam"
                data-ak-app-chat=""
              >
                {resolved?.ok ? (
                  demo.key === 'choice-list' ? (
                    <ChoiceList frame={demo.frame as never} manifest={manifest} onSelect={() => undefined} />
                  ) : (
                    <StandardComponent
                      frame={demo.frame as never}
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
    </div>
  )
}
