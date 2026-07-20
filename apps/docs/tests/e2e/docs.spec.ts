import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const askMode = process.env.DOCS_ASK_MODE?.trim() || 'unconfigured'

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('pre')
    .exclude('code')
    .exclude('.text-ak-blue')
    .disableRules(['color-contrast', 'link-in-text-block'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const assistant = page.getByRole('complementary', { name: 'AgentsKit Chat documentation assistant' })
  const input = assistant.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Which clients are supported?')
  await assistant.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(assistant.getByText(/React, React Native, Svelte, Vue, Angular, Solid, and Ink/)).toBeVisible()
  await expect(assistant.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await assistant.getByRole('link', { name: 'Release compatibility' }).click()
  await expect(page).toHaveURL(/\/docs\/releases\/compatibility$/)
})

test('uses the product landing as the entry point and docs as the learning path', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /One agent experience/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /One definition\. Everything else plugs in/i })).toBeVisible()
  await expect(page.getByText('live', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Works with', { exact: false }).first()).toBeVisible()
  const worksWith = page.getByRole('region', { name: 'Works with' })
  await expect(worksWith.locator('img')).toHaveCount(0)
  await expect(worksWith.locator('svg')).toHaveCount(7)
  await expect(page.getByRole('link', { name: 'Build the interface' })).toHaveAttribute('href', '/docs/getting-started')
  await expect(page.getByRole('link', { name: /See every surface/i })).toHaveAttribute('href', '#surfaces')
  const footer = page.locator('footer')
  await expect(footer).toBeVisible()
  await expect(footer.getByText('One agent experience. Every surface.')).toBeVisible()
  await expect(footer.getByRole('navigation', { name: 'AgentsKit products' }).getByRole('link')).toHaveCount(6)
  await expect(footer.getByRole('link', { name: 'Code Review' })).toHaveCount(0)
  // no useless product chrome
  await expect(page.getByText('agentskit.chat')).toHaveCount(0)
  await page.getByRole('link', { name: 'Build the interface' }).click()
  await expect(page).toHaveURL(/\/docs\/getting-started/)
})

test('follows the system color scheme without losing product contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(false)
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)')
  await expect.poll(() => page.getByRole('heading', { name: /One agent experience/i }).evaluate(element => getComputedStyle(element).color)).toBe('rgb(13, 17, 23)')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(true)
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(13, 17, 23)')
  await expect.poll(() => page.getByRole('heading', { name: /One agent experience/i }).evaluate(element => getComputedStyle(element).color)).toBe('rgb(230, 237, 243)')
})

test('keeps framework install tabs interactive on getting started', async ({ page }) => {
  await page.goto('/docs/getting-started')
  await expect(page.getByRole('heading', { name: 'Get started' }).first()).toBeVisible()
  const tablist = page.getByRole('tablist', { name: 'Choose a renderer' }).first()
  await expect(tablist).toBeVisible()
  await page.getByRole('tab', { name: 'Vue' }).first().click()
  await expect(page.getByText(/--renderer vue/)).toBeVisible()
  await page.locator('a[href="/docs/getting-started/react"]').first().click()
  await expect(page).toHaveURL(/\/docs\/getting-started\/react$/)
})

test('keeps the interactive assistant usable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/getting-started/react')
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const assistant = page.getByRole('complementary', { name: 'AgentsKit Chat documentation assistant' })
  await expect(assistant).toBeInViewport()
  await expect(page.getByPlaceholder('Ask about AgentsKit Chat…')).toBeVisible()
  const box = await assistant.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  await expect(assistant).toHaveScreenshot('mobile-assistant.png', {
    animations: 'disabled',
    mask: [assistant.locator('strong'), assistant.locator('p'), assistant.locator('button'), assistant.locator('input')],
    maxDiffPixelRatio: 0.01,
  })
})

test('supports keyboard focus and restores it when the assistant closes', async ({ page }) => {
  await page.goto('/docs/backend')
  const assistant = page.getByRole('button', { name: 'Ask the docs' })
  await assistant.focus()
  await expect(assistant).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Close documentation assistant' })).toBeFocused()
  await page.getByRole('button', { name: 'Close documentation assistant' }).click()
  await expect(page.getByRole('button', { name: 'Ask the docs' })).toBeFocused()
})

test('enforces the selected hosted Ask smoke profile', async ({ page }) => {
  await page.goto('/docs/backend')
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Compare every deployment topology')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  if (askMode === 'configured') {
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
    await expect(page.getByText('Ask request failed (503).')).toHaveCount(0)
  } else {
    await expect(page.getByText('Ask request failed (503).')).toBeVisible()
  }
})

test('publishes public docs surface and machine-readable artifacts', async ({ request }) => {
  const [
    home, docs, guide, index, llms, llmsFull, knowledge,
    raw, rawIndex, rawPrivate, architectureDoc, product,
    forAgents, search, sitemap, robots, architectureAsset,
  ] = await Promise.all([
    request.get('/'),
    request.get('/docs'),
    request.get('/docs/guides/install-and-run'),
    request.get('/docs/getting-started'),
    request.get('/llms.txt'),
    request.get('/llms-full.txt'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.mdx'),
    request.get('/raw/index.mdx'),
    request.get('/raw/architecture/overview.md'),
    request.get('/docs/architecture/overview'),
    request.get('/docs/product/PRD'),
    request.get('/for-agents'),
    request.get('/api/search?query=react'),
    request.get('/sitemap.xml'),
    request.get('/robots.txt'),
    request.get('/assets/agentschat-architecture.svg'),
  ])

  expect(home.ok()).toBe(true)
  expect(await home.text()).toMatch(/One agent experience/i)
  expect(docs.ok()).toBe(true)
  expect(guide.ok()).toBe(true)
  expect(await guide.text()).toContain('Install and run')
  expect(index.ok()).toBe(true)
  expect(await index.text()).toContain('Get started')

  expect(llms.ok()).toBe(true)
  const concise = await llms.text()
  expect(concise).toContain('AgentsKit Chat')
  expect(concise.length).toBeLessThan(10_000)
  expect(concise).not.toContain('architecture/overview')
  expect(concise).not.toContain('for-agents/index')
  for (const productUrl of [
    'https://www.agentskit.io/docs',
    'https://registry.agentskit.io/docs',
    'https://chat.agentskit.io/docs',
    'https://playbook.agentskit.io/docs',
    'https://doc-bridge.agentskit.io/',
    'https://github.com/AgentsKit-io/code-review-cli#readme',
    'https://akos.agentskit.io/docs',
  ]) expect(concise).toContain(productUrl)

  expect(llmsFull.ok()).toBe(true)
  const complete = await llmsFull.text()
  expect(complete).toContain('canonical documentation corpus')
  expect(complete.length).toBeGreaterThan(concise.length)
  expect(complete).not.toMatch(/<!-- architecture\//)

  // Entry point redirects maintainers to the repo tree (not public docs).
  expect(forAgents.status()).toBeLessThan(400)
  expect(forAgents.url()).toMatch(/github\.com\/AgentsKit-io\/agentskit-chat/)

  expect(knowledge.ok()).toBe(true)
  expect((await knowledge.json()).protocol).toBe('agentskit.chat.knowledge')

  expect(raw.ok()).toBe(true)
  expect(await raw.text()).toMatch(/createAskServiceHandler|Ask backend|Hosted and self-hosted/i)
  expect(rawIndex.ok()).toBe(true)
  expect(await rawIndex.text()).toContain('title: AgentsKit Chat')
  expect(rawPrivate.status()).toBe(404)
  expect(architectureDoc.status()).toBe(404)
  expect(product.status()).toBe(404)

  expect(architectureAsset.ok()).toBe(true)
  expect(architectureAsset.headers()['content-type']).toContain('image/svg+xml')
  expect(search.ok()).toBe(true)
  expect(await search.text()).toContain('React quick start')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain('/docs/getting-started')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain('Sitemap:')
})

test('serves the public portal with baseline security headers', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  expect(response.headers()).toEqual(expect.objectContaining({
    'content-security-policy': expect.stringContaining("script-src 'self' 'unsafe-inline' https://www.agentskit.io"),
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  }))
})
