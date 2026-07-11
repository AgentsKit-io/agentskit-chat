import { expect, test } from '@playwright/test'
import { testChatConformance } from './chat-conformance'

test('renders the committed complete snapshot through the real Expo shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('AgentsKit received: hello')).toBeVisible()
})

testChatConformance({ placeholder: 'Send a message or type /slow', stopName: 'Stop response' })
