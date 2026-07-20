'use client'

import Script from 'next/script'
import { useState } from 'react'
import { ecosystemBarProducts } from '@/lib/ecosystem'

export function SharedEcosystemBar() {
  const [sharedReady, setSharedReady] = useState(false)

  function validateSharedBar() {
    requestAnimationFrame(() => {
      const shared = document.querySelector<HTMLElement>('#ak-eco')
      const links = shared?.querySelectorAll('a.ak-eco-link:not(.ak-eco-cta)').length ?? 0
      if (shared && links === ecosystemBarProducts.length) {
        setSharedReady(true)
        return
      }
      shared?.setAttribute('hidden', '')
      setSharedReady(false)
    })
  }

  return <>
    <Script
      src="https://www.agentskit.io/ecosystem-bar.js"
      strategy="afterInteractive"
      data-current="agentskit-chat"
      onLoad={validateSharedBar}
      onReady={validateSharedBar}
    />
    {sharedReady ? null : <div className="ak-ecosystem-fallback" role="status">
      Loading AgentsKit ecosystem navigation…
    </div>}
  </>
}
