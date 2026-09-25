'use client'

import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'

const FRAMEWORKS = [
  { slug: 'react', label: 'React' },
  { slug: 'vuedotjs', label: 'Vue' },
  { slug: 'svelte', label: 'Svelte' },
  { slug: 'solid', label: 'Solid' },
  { slug: 'angular', label: 'Angular' },
  { slug: 'expo', label: 'React Native' },
  { slug: null as string | null, label: 'Ink' },
  { slug: 'typescript', label: 'TypeScript' },
]

/** Framework reel follows the motion and timing used by the AgentsKit home. */
export function WorksWithLogos() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % FRAMEWORKS.length)
    }, 2100)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const active = FRAMEWORKS[activeIndex] ?? FRAMEWORKS[0]!

  return (
    <div
      role="img"
      aria-label={`Works with ${FRAMEWORKS.map(({ label }) => label).join(', ')}`}
      data-kinetic-reel=""
      data-current={active.slug ?? 'ink'}
      className="flex min-h-8 items-center gap-4 sm:gap-5"
    >
      <span aria-hidden="true" className="shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-ak-graphite">
        Works with
      </span>
      <span aria-hidden="true" className="relative h-8 w-36 overflow-hidden [perspective:360px]">
        <span
          key={active.label}
          data-reel-item=""
          className="chat-framework-reel-item absolute inset-0 flex items-center gap-2 text-sm font-medium text-ak-foam"
        >
          <BrandIcon slug={active.slug} label={active.label} size={20} imgClass="h-5 w-5" />
          <span>{active.label}</span>
        </span>
      </span>
    </div>
  )
}
