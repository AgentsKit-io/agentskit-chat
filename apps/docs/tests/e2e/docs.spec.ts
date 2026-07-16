import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
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
  await expect(page.getByText('live', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Works with', { exact: false }).first()).toBeVisible()
  // no useless product chrome
  await expect(page.getByText('agentskit.chat')).toHaveCount(0)
  await page.getByRole('link', { name: /Install & run/i }).first().click()
  await expect(page).toHaveURL(/\/docs\/guides\/install-and-run/)
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

test('publishes public docs surface and keeps machine-readable artifacts', async ({ request }) => {
  const [home, docs, guide, llms, knowledge, raw, architecture, product] = await Promise.all([
    request.get('/'),
    request.get('/docs'),
    request.get('/docs/guides/install-and-run'),
    request.get('/llms.txt'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.md'),
    request.get('/docs/architecture/overview'),
    request.get('/docs/product/PRD'),
  ])
  expect(home.ok()).toBe(true)
  expect(await home.text()).toMatch(/One AI chat/i)
  expect(docs.ok()).toBe(true)
  expect(guide.ok()).toBe(true)
  expect(await guide.text()).toContain('Install and run')
  expect(llms.ok()).toBe(true)
  expect(knowledge.ok()).toBe(true)
  expect(raw.ok()).toBe(true)
  // private maintainer docs must not be on the public site
  expect(architecture.status()).toBe(404)
  expect(product.status()).toBe(404)
})
