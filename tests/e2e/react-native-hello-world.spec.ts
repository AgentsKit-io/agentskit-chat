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

test('completes deterministic onboarding through native controls', async ({ page }) => {
  await page.goto('/?reference=onboarding')
  const input = page.getByPlaceholder('Type /onboarding to begin')
  await input.fill('/onboarding')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('radio', { name: 'Engineering' }).click()
  await page.getByLabel('First goal').fill('Automate handoffs')
  await page.getByRole('button', { name: 'Save answers' }).click()
  await input.fill('/recommend')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Use this setup' }).click()
  await input.fill('/accept')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Complete onboarding' }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await input.fill('/done')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText('Onboarding complete. Your guided workspace is ready.')).toBeVisible()
})

test('confirms a protected operation through native controls', async ({ page }) => {
  await page.goto('/?reference=operations')
  const input = page.getByPlaceholder('Type /operations to begin')
  await input.fill('/operations')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Restart operation' }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(/checkout-api restarted/)).toBeVisible()
})

test('renders a grounded RAG source through native controls', async ({ page }) => {
  await page.goto('/?reference=rag')
  const input = page.getByPlaceholder('Ask a grounded question')
  await input.fill('How does AgentsKit Chat work?')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await expect(page.getByText('AgentsKit Chat overview')).toBeVisible()
})
