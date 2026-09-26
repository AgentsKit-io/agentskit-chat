import { decodeAskEvents, verifyLocalKnowledgeArtifactSync } from '@agentskit/chat/protocol'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createDocsAskHandler, unavailableAskResponse } from '../lib/ask-handler'
import { collectCanonicalDocs, publicDocSlug } from '../lib/docs-index'
import { allEcosystemProducts, ecosystemBarProducts } from '../lib/ecosystem'
import { KNOWLEDGE_HASH, localKnowledgeArtifact, verifiedKnowledgeArtifact } from '../lib/knowledge'
import { DEFAULT_SHELL_ORIGIN, SHELL_PRODUCT_ID, SHELL_PRODUCT_REPO, resolveShellOrigin, shellScriptSrc, shellStylesheetHref } from '../lib/shell'
import { chatStructuredData, serializedChatStructuredData } from '../lib/structured-data'

const askRequest = (query: string) => new Request('https://chat.agentskit.io/api/ask?corpus=agentskit-chat-public&persona=agentskit-chat-guide', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ protocol: 'agentskit.chat.ask', version: 1, messages: [{ role: 'user', content: query }] }),
})

describe('documentation dogfood', () => {
  it('renders framework marks inline without a third-party image origin', () => {
    const iconSource = readFileSync(new URL('../components/brand-icon.tsx', import.meta.url), 'utf8')
    expect(iconSource).toContain('<svg')
    expect(iconSource).not.toContain('cdn.simpleicons.org')
  })

  it('adopts AgentsKit shell v1 from the configurable shell origin', () => {
    const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
    const shellSource = readFileSync(new URL('../components/agentskit-shell.tsx', import.meta.url), 'utf8')
    expect(resolveShellOrigin(undefined)).toBe(DEFAULT_SHELL_ORIGIN)
    expect(DEFAULT_SHELL_ORIGIN).toBe('https://www.agentskit.io')
    expect(resolveShellOrigin('http://localhost:3000/')).toBe('http://localhost:3000')
    expect(resolveShellOrigin('not a url')).toBe(DEFAULT_SHELL_ORIGIN)
    expect(shellScriptSrc).toMatch(/\/shell\/v1\.js$/)
    expect(shellStylesheetHref).toMatch(/\/shell\/v1\.css$/)
    expect(layoutSource).toContain('href={shellStylesheetHref}')
    expect(layoutSource).toContain('<AgentsKitShellScript />')
    expect(shellSource).toContain('data-current={SHELL_PRODUCT_ID}')
    expect(shellSource).toContain('data-current-repo={SHELL_PRODUCT_REPO}')
    expect(SHELL_PRODUCT_ID).toBe('agentskit-chat')
    expect(SHELL_PRODUCT_REPO).toBe('AgentsKit-io/agentskit-chat')
    expect(layoutSource).not.toContain('ecosystem-bar')
  })

  it('uses the shell aurora, tour and footer on the home page instead of local copies', () => {
    const landingSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
    const footerSource = readFileSync(new URL('../components/site-footer.tsx', import.meta.url), 'utf8')
    const showcaseSource = readFileSync(new URL('../components/shared-ecosystem-showcase.tsx', import.meta.url), 'utf8')
    const shellSource = readFileSync(new URL('../components/agentskit-shell.tsx', import.meta.url), 'utf8')
    expect(landingSource).toContain('<AgentsKitAurora />')
    // The home is dark by design: the shell paints its bar, tour, footer and aurora dark in both themes.
    expect(landingSource).toContain('data-ak-surface="dark"')
    // Every page (home and docs) renders the shared footer from the root layout.
    const rootLayoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
    expect(rootLayoutSource).toContain('<SiteFooter />')
    expect(landingSource).not.toContain('<SiteFooter />')
    expect(landingSource).not.toMatch(/LiquidCursorGradient|AuroraBackground/)
    expect(shellSource).toContain("'agentskit-aurora'")
    expect(footerSource).toContain("'agentskit-footer'")
    expect(footerSource).toContain('ecosystemBarProducts.map')
    expect(footerSource).toContain('/blob/main/LICENSE')
    expect(footerSource).not.toContain('chat-home-footer')
    expect(showcaseSource).toContain("'agentskit-ecosystem'")
    expect(showcaseSource).toContain("current: 'agentskit-chat'")
    expect(showcaseSource).toContain("'data-visual': 'agentskit-home'")
  })

  it('keeps the GitHub star only in the shell bar and uses the shared product wordmark', () => {
    const headerSource = readFileSync(new URL('../components/product-header.tsx', import.meta.url), 'utf8')
    const docsLayoutSource = readFileSync(new URL('../app/docs/layout.tsx', import.meta.url), 'utf8')
    const shellSource = readFileSync(new URL('../components/agentskit-shell.tsx', import.meta.url), 'utf8')
    expect(headerSource).not.toMatch(/github\.com|GitHub/)
    expect(docsLayoutSource).not.toMatch(/github\.com|GitHub/)
    expect(headerSource).toContain('<ProductWordmark />')
    expect(docsLayoutSource).toContain('title: <ProductWordmark />')
    expect(shellSource).toContain('className="ak-product-wordmark"')
    expect(shellSource).toContain('className="ak-product-wordmark__brand">AgentsKit<')
    expect(shellSource).toContain('className="ak-product-wordmark__product">Chat<')
  })

  it('lets the product surface follow the system color scheme', () => {
    const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
    expect(layoutSource).not.toContain('className="dark"')
    expect(layoutSource).toContain("defaultTheme: 'system'")
    expect(layoutSource).toContain('enableSystem: true')
  })

  it('ships one semantic product header with the native docs search', () => {
    const headerSource = readFileSync(new URL('../components/product-header.tsx', import.meta.url), 'utf8')
    const docsLayoutSource = readFileSync(new URL('../app/docs/layout.tsx', import.meta.url), 'utf8')
    expect(headerSource).toContain('aria-label="AgentsKit Chat"')
    expect(headerSource).toContain("fumadocs-ui/components/layout/search-toggle")
    expect(headerSource).toContain('h-14')
    expect(headerSource).toContain('min-h-11')
    expect(docsLayoutSource).not.toMatch(/Alpha|maturity-badge/)
  })

  it('publishes complete social metadata from a generated OG route', () => {
    const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
    const landingSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
    const imageSource = readFileSync(new URL('../app/opengraph-image.tsx', import.meta.url), 'utf8')
    expect(layoutSource).toContain("card: 'summary_large_image'")
    expect(layoutSource).toContain("images: ['/opengraph-image']")
    expect(landingSource).toContain("siteName: 'AgentsKit Chat'")
    expect(imageSource).toContain('new ImageResponse')
    expect(imageSource).toContain('width: 1200, height: 630')
  })

  it('publishes factual structured data for the public source project', () => {
    expect(JSON.parse(serializedChatStructuredData)).toEqual(chatStructuredData)
    expect(chatStructuredData['@graph']).toContainEqual(expect.objectContaining({
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#organization',
      sameAs: ['https://github.com/AgentsKit-io'],
    }))
    expect(chatStructuredData['@graph']).toContainEqual(expect.objectContaining({
      '@type': 'SoftwareSourceCode',
      '@id': 'https://chat.agentskit.io/#software',
      codeRepository: 'https://github.com/AgentsKit-io/agentskit-chat',
      license: 'https://github.com/AgentsKit-io/agentskit-chat/blob/main/LICENSE',
      programmingLanguage: 'TypeScript',
    }))
  })

  it('publishes a bounded, self-verifying public knowledge artifact', () => {
    expect(verifiedKnowledgeArtifact).not.toBeNull()
    expect(verifyLocalKnowledgeArtifactSync(localKnowledgeArtifact, {
      expectedContentHash: KNOWLEDGE_HASH,
      expectedSiteId: 'agentskit-chat-docs',
    })).toEqual(expect.objectContaining({ ok: true }))
  })

  it('rejects a corrupted deterministic artifact', () => {
    expect(verifyLocalKnowledgeArtifactSync({ ...localKnowledgeArtifact, artifactId: 'tampered' }, {
      expectedContentHash: KNOWLEDGE_HASH,
      expectedSiteId: 'agentskit-chat-docs',
    })).toEqual(expect.objectContaining({ ok: false, diagnostic: expect.objectContaining({ code: 'DETERMINISTIC_HASH_MISMATCH' }) }))
  })

  it('indexes the public product corpus without private maintainer trees', async () => {
    const documents = await collectCanonicalDocs()
    // Public product surface only (architecture / for-agents / protocol stay repo-only).
    expect(documents.length).toBeGreaterThan(30)
    expect(documents.every(document => !document.path.startsWith('architecture/')
      && !document.path.startsWith('for-agents/')
      && !document.path.startsWith('product/')
      && !document.path.startsWith('protocol/'))).toBe(true)
    expect(documents.some(document => document.path === 'index.mdx' && document.title === 'AgentsKit Chat' && document.description.includes('AI chat'))).toBe(true)
    expect(documents.some(document =>
      document.path === 'backend.mdx'
      && document.title.includes('Ask backend'),
    )).toBe(true)
  })

  it('maps canonical index documents to public folder URLs', () => {
    expect(publicDocSlug('index.mdx')).toBe('')
    expect(publicDocSlug('getting-started/index.mdx')).toBe('getting-started')
    expect(publicDocSlug('for-agents/index.md')).toBe('for-agents')
    expect(publicDocSlug('backend.md')).toBe('backend')
  })

  it('derives the six shell products in fixed order and keeps Playbook out of the bar', () => {
    expect(allEcosystemProducts.map(product => product.id)).toEqual([
      'agentskit',
      'registry',
      'agentskit-chat',
      'doc-bridge',
      'code-review',
      'harness',
      'playbook',
    ])
    expect(ecosystemBarProducts.map(product => product.id)).toEqual([
      'agentskit',
      'registry',
      'agentskit-chat',
      'doc-bridge',
      'code-review',
      'harness',
    ])
  })

  it('runs the public Ask handler with injected grounded adapters and citations', async () => {
    const retrieve = vi.fn(() => [{ id: 'backend', title: 'Backend integration', href: '/docs/backend', excerpt: 'Hosts inject AgentsKit retrieval and generation.' }])
    const handler = createDocsAskHandler({
      retriever: { retrieve },
      generator: { async *generate({ sources }) { yield { type: 'text', delta: `Grounded in ${sources[0]?.title}.` } } },
      authenticate: () => ({ ok: true, context: { subjectId: 'docs-test-user' } }),
      resolveSubjectId: context => context.subjectId,
      resolveSite: () => ({
        protocol: 'agentskit.chat.backend-site', version: 1, siteId: 'agentskit-chat-docs',
        assistant: { id: 'agentskit-chat-guide', name: 'AgentsKit Chat guide', suggestions: ['Which clients are supported?'] },
        corpus: { id: 'agentskit-chat-public', mode: 'local' }, components: ['source-list'], actions: [],
        limits: { requestTimeoutMs: 30_000, retrievalTimeoutMs: 8_000, generationTimeoutMs: 20_000, maxSources: 5 },
        persistence: { mode: 'disabled' },
      }),
      rateLimit: () => ({ allowed: true }),
    })
    const response = await handler(askRequest('How are hosted and self-hosted backends equivalent?'))
    const events = decodeAskEvents(await response.text()).events
    expect(response.status).toBe(200)
    expect(retrieve).toHaveBeenCalledOnce()
    expect(events).toEqual(expect.arrayContaining([
      { type: 'text', delta: 'Grounded in Backend integration.' },
      expect.objectContaining({ type: 'tool', name: 'cite' }),
      expect.objectContaining({ type: 'done' }),
    ]))
  })

  it('fails closed when a deployment has no grounded adapters', async () => {
    const response = unavailableAskResponse()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: {
      code: 'ASK_INTERNAL',
      message: 'The grounded Ask backend is not configured for this deployment.',
      retryable: false,
    } })
  })
})
