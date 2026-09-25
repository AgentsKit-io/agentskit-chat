'use client'

import { useEffect, useRef } from 'react'

export function LiquidCursorGradient() {
  const gradientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const gradient = gradientRef.current
    if (!gradient) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches || coarsePointer.matches) return
      gradient.style.setProperty('--chat-cursor-x', `${event.clientX}px`)
      gradient.style.setProperty('--chat-cursor-y', `${event.clientY}px`)
      gradient.dataset.active = 'true'
    }
    const leave = () => { gradient.dataset.active = 'false' }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    reducedMotion.addEventListener('change', leave)
    coarsePointer.addEventListener('change', leave)

    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
      reducedMotion.removeEventListener('change', leave)
      coarsePointer.removeEventListener('change', leave)
    }
  }, [])

  return (
    <div ref={gradientRef} className="chat-liquid-cursor" data-chat-liquid-cursor="" aria-hidden="true">
      <span className="chat-liquid-cursor__orb chat-liquid-cursor__orb--blue" />
      <span className="chat-liquid-cursor__orb chat-liquid-cursor__orb--green" />
    </div>
  )
}
