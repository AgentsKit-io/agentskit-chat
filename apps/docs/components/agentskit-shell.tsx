import Script from 'next/script'
import { createElement } from 'react'
import { SHELL_PRODUCT_ID, SHELL_PRODUCT_REPO, shellScriptSrc } from '@/lib/shell'

/** Loads shell v1: auto-injects the ecosystem bar (Star targets this repo) and upgrades the shell elements. */
export function AgentsKitShellScript() {
  return <Script
    id="agentskit-shell-v1"
    src={shellScriptSrc}
    strategy="afterInteractive"
    data-current={SHELL_PRODUCT_ID}
    data-current-repo={SHELL_PRODUCT_REPO}
  />
}

/** Shared animated background; fixed, aria-hidden and non-interactive (styled by v1.css). */
export function AgentsKitAurora() {
  return createElement('agentskit-aurora', { 'aria-hidden': 'true' })
}

/** Product wordmark for headers; typography and colours come from v1.css. */
export function ProductWordmark() {
  return <span className="ak-product-wordmark">
    <span className="ak-product-wordmark__brand">AgentsKit</span>{' '}
    <span className="ak-product-wordmark__product">Chat</span>
  </span>
}
