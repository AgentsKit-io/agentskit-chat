import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
  // Syntax themes intentionally use multi-hue tokens; exclude only pre/code
  // color-contrast noise while keeping AA on chrome, nav, and prose.
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('pre')
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Which clients are supported?')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText(/React, React Native, Svelte, Vue, Angular, Solid, and Ink/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await page.getByRole('link', { name: 'Release compatibility' }).click()
  await expect(page).toHaveURL(/\/docs\/releases\/compatibility$/)
})

test('uses the product landing as the entry point and docs as the learning path', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /One AI chat/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /One definition\. Everything else plugs in/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Same definition\. Different shells/i })).toBeVisible()
  await expect(page.getByText('live', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Works with', { exact: false }).first()).toBeVisible()
  await page.getByRole('link', { name: /Read the docs/i }).click()
  await expect(page).toHaveURL(/\/docs$/)
  await expect(page.getByRole('heading', { name: 'AgentsKit Chat', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Continue through the ecosystem' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View canonical Markdown' })).toHaveAttribute('href', '/raw/index.mdx')
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

test('keeps unavailable backend behavior explicit and supports keyboard focus', async ({ page }) => {
  await page.goto('/docs/backend')
  const assistant = page.getByRole('button', { name: 'Ask the docs' })
  await assistant.focus()
  await expect(assistant).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Close documentation assistant' })).toBeFocused()
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Compare every deployment topology')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText('Ask request failed (503).')).toBeVisible()
  await page.getByRole('button', { name: 'Close documentation assistant' }).click()
  await expect(page.getByRole('button', { name: 'Ask the docs' })).toBeFocused()
})

test('publishes canonical folder indexes, metadata, and machine-readable public docs', async ({ request }) => {
  const [home, docs, index, llms, full, forAgents, knowledge, raw, rawIndex, architecture] = await Promise.all([
    request.get('/'),
    request.get('/docs'),
    request.get('/docs/getting-started'),
    request.get('/llms.txt'),
    request.get('/llms-full.txt'),
    request.get('/for-agents'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.md'),
    request.get('/raw/index.mdx'),
    request.get('/assets/agentschat-architecture.svg'),
  ])
  expect(home.ok()).toBe(true)
  const homeHtml = await home.text()
  expect(homeHtml).toMatch(/One AI chat/i)
  expect(homeHtml).toMatch(/Everything else plugs in/i)
  expect(docs.ok()).toBe(true)
  expect(await docs.text()).toContain('Continue through the ecosystem')
  expect(index.ok()).toBe(true)
  expect(await index.text()).toContain('Get started')
  expect(llms.ok()).toBe(true)
  const concise = await llms.text()
  expect(concise).toContain('AgentsKit Chat')
  expect(concise.length).toBeLessThan(10_000)
  expect(concise).toContain('https://akos.agentskit.io')
  expect(full.ok()).toBe(true)
  expect((await full.text()).length).toBeGreaterThan(concise.length)
  expect(forAgents.ok()).toBe(true)
  expect(forAgents.url()).toContain('/docs/for-agents')
  expect(knowledge.ok()).toBe(true)
  expect((await knowledge.json()).protocol).toBe('agentskit.chat.knowledge')
  expect(raw.ok()).toBe(true)
  expect(await raw.text()).toContain('# Hosted and self-hosted Ask backend')
  expect(rawIndex.ok()).toBe(true)
  expect(await rawIndex.text()).toContain('title: AgentsKit Chat')
  expect(architecture.ok()).toBe(true)
  expect(architecture.headers()['content-type']).toContain('image/svg+xml')
})
