import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
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

test('shows every public maturity state and preserves the landing layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const maturity = page.getByTestId('maturity-grid')
  for (const state of ['Released', 'Alpha', 'Planned', 'Unavailable']) {
    await expect(maturity.getByText(state, { exact: true })).toBeVisible()
  }
  await expect(maturity).toHaveScreenshot('maturity-grid.png', {
    animations: 'disabled',
    mask: [maturity.locator('strong'), maturity.locator('p')],
    maxDiffPixelRatio: 0.01,
  })
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
  const [index, llms, llmsFull, knowledge, raw, search, sitemap, robots] = await Promise.all([
    request.get('/docs/getting-started'),
    request.get('/llms.txt'),
    request.get('/llms-full.txt'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.md'),
    request.get('/api/search?query=react'),
    request.get('/sitemap.xml'),
    request.get('/robots.txt'),
  ])
  expect(index.ok()).toBe(true)
  expect(await index.text()).toContain('Get started')
  expect(llms.ok()).toBe(true)
  expect(await llms.text()).toContain('AgentsKit Chat')
  expect(llmsFull.ok()).toBe(true)
  expect(await llmsFull.text()).toContain('canonical documentation corpus')
  expect(knowledge.ok()).toBe(true)
  expect((await knowledge.json()).protocol).toBe('agentskit.chat.knowledge')
  expect(raw.ok()).toBe(true)
  expect(await raw.text()).toContain('# Hosted and self-hosted Ask backend')
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
    'content-security-policy': expect.stringContaining("default-src 'self'"),
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  }))
})
