import { expect, test } from '@playwright/test'

test('streams a deterministic answer', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Send a message or type /fail').fill('hello')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('AgentsKit received: hello')).toBeVisible()
})

test('announces adapter errors', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Send a message or type /fail').fill('/fail')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByRole('alert')).toContainText('failed as requested')
})
