'use client'

import { useEffect, useState } from 'react'
import { HighlightedCode, RENDERER_EXAMPLES } from '@/components/highlighted-code'

export function RendererCodeShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [manualSelection, setManualSelection] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const active = RENDERER_EXAMPLES[activeIndex] ?? RENDERER_EXAMPLES[0]

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (paused || manualSelection || reduceMotion) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % RENDERER_EXAMPLES.length)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [manualSelection, paused, reduceMotion])

  return (
    <div
      data-renderer-showcase=""
      className="min-w-0 max-w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div role="tablist" aria-label="Chat renderer examples" className="mb-3 flex max-w-full gap-1 overflow-x-auto pb-1">
        {RENDERER_EXAMPLES.map((example, index) => (
          <button
            key={example.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls="renderer-example-panel"
            onClick={() => {
              setActiveIndex(index)
              setManualSelection(true)
            }}
            className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors ${
              index === activeIndex
                ? 'bg-ak-surface text-ak-foam'
                : 'text-ak-graphite hover:bg-ak-surface/70 hover:text-ak-foam'
            }`}
          >
            {example.label}
          </button>
        ))}
      </div>
      <div id="renderer-example-panel" role="tabpanel" aria-label={`${active.label} example`} key={active.id} className="chat-code-reveal">
        <HighlightedCode title={`runs everywhere · ${active.label}`} lines={active.lines} />
      </div>
    </div>
  )
}
