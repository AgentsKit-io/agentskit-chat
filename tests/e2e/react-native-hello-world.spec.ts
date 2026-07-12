import { expect, test } from '@playwright/test'
import { testChatConformance } from './chat-conformance'

test('renders the support reference through the real Expo shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Answers now. A human when you need one.')).toBeVisible()
  await expect(page.getByText('AgentsKit received: hello')).toBeVisible()
})

testChatConformance({ placeholder: 'Ask support or type /support', stopName: 'Stop response' })

test('opens a support ticket only after native confirmation', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('Ask support or type /support')
  await input.fill('/support')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Open support ticket' }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(/SUP-/)).toBeVisible()
})
