'use client'

import Script from 'next/script'
import { useState } from 'react'

const products = [
  { id: 'agentskit', label: 'AgentsKit', href: 'https://www.agentskit.io' },
  { id: 'registry', label: 'Registry', href: 'https://registry.agentskit.io' },
  { id: 'agentskit-chat', label: 'Chat', href: '/docs' },
  { id: 'playbook', label: 'Playbook', href: 'https://playbook.agentskit.io' },
  { id: 'doc-bridge', label: 'Doc Bridge', href: 'https://agentskit-io.github.io/doc-bridge/' },
  { id: 'code-review', label: 'Code Review', href: 'https://github.com/AgentsKit-io/code-review-cli#readme' },
  { id: 'akos', label: 'AKOS', href: 'https://akos.agentskit.io' },
] as const

export function SharedEcosystemBar() {
  const [sharedReady, setSharedReady] = useState(false)

  function validateSharedBar() {
    requestAnimationFrame(() => {
      const shared = document.querySelector<HTMLElement>('#ak-eco')
      const links = shared?.querySelectorAll('a.ak-eco-link:not(.ak-eco-cta)').length ?? 0
      if (shared && links === products.length) {
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
    {sharedReady ? null : <nav aria-label="AgentsKit ecosystem" className="ak-ecosystem-fallback">
      {products.map(product => <a
        key={product.id}
        href={product.href}
        aria-current={product.id === 'agentskit-chat' ? 'page' : undefined}
      >{product.label}</a>)}
    </nav>}
  </>
}
