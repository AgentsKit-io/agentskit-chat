import { expect, test } from '@playwright/test'

test('vue hosts the shared support reference', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Answers now')
  const input = page.getByPlaceholder('Ask support or type /support')
  await input.fill('/support')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Open support ticket' }).click()
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(/SUP-1/)).toBeVisible()
})

test('vue hosts the shared RAG reference', async ({ page }) => {
  await page.goto('/?reference=rag')
  const input = page.getByPlaceholder('Ask a grounded question')
  await input.fill('How does AgentsKit Chat work?')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText('AgentsKit Chat overview')).toBeVisible()
})
