import { testChatConformance } from './chat-conformance'
import { expect, test } from '@playwright/test'

testChatConformance({ placeholder: 'Ask support or type /support', stopName: 'Stop' })

test('opens a support ticket only after confirmation', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('Ask support or type /support')
  await input.fill('/support')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Open support ticket' }).click()
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(/SUP-1/)).toBeVisible()
})
