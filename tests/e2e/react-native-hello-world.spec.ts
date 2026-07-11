import { expect, test } from '@playwright/test'

test('runs the shared definition through Expo web', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Send a message or type /slow').fill('native')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('AgentsKit received: native')).toBeVisible()
})

test('cancels an active native response', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Send a message or type /slow').fill('/slow')
  await page.getByRole('button', { name: 'Send message' }).click()
  await page.getByRole('button', { name: 'Stop response' }).click()
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeHidden()
})
