import { expect, test } from '@playwright/test'

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
  await expect(page).toHaveScreenshot('react-quick-start.png', { fullPage: true, animations: 'disabled', maxDiffPixels: 100 })
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Which clients are supported?')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText(/React, React Native, Svelte, Vue, Angular, Solid, and Ink/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
})

test('keeps unavailable backend behavior explicit and supports keyboard focus', async ({ page }) => {
  await page.goto('/docs/backend')
  const assistant = page.getByRole('button', { name: 'Ask the docs' })
  await assistant.focus()
  await expect(assistant).toBeFocused()
  await page.keyboard.press('Enter')
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Compare every deployment topology')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText('Ask request failed (503).')).toBeVisible()
})

test('publishes metadata and machine-readable public docs', async ({ request }) => {
  const [llms, knowledge, raw] = await Promise.all([
    request.get('/llms.txt'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.md'),
  ])
  expect(llms.ok()).toBe(true)
  expect(await llms.text()).toContain('AgentsKit Chat')
  expect(knowledge.ok()).toBe(true)
  expect((await knowledge.json()).protocol).toBe('agentskit.chat.knowledge')
  expect(raw.ok()).toBe(true)
  expect(await raw.text()).toContain('# Hosted and self-hosted Ask backend')
})
