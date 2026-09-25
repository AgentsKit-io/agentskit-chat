/**
 * AgentsKit shell v1 integration (ecosystem bar, tour, footer, aurora, shared tokens).
 * The shell is hosted by the AgentsKit site; local review points
 * NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN at http://localhost:3000.
 */
export const DEFAULT_SHELL_ORIGIN = 'https://www.agentskit.io'

export function resolveShellOrigin(value: string | undefined): string {
  const candidate = value?.trim()
  if (!candidate) return DEFAULT_SHELL_ORIGIN
  try {
    return new URL(candidate).origin
  } catch {
    return DEFAULT_SHELL_ORIGIN
  }
}

export const shellOrigin = resolveShellOrigin(process.env.NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN)
export const shellScriptSrc = `${shellOrigin}/shell/v1.js`
export const shellStylesheetHref = `${shellOrigin}/shell/v1.css`

export const SHELL_PRODUCT_ID = 'agentskit-chat'
export const SHELL_PRODUCT_REPO = 'AgentsKit-io/agentskit-chat'
