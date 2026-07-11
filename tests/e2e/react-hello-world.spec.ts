import { testChatConformance } from './chat-conformance'
import { expect, test } from '@playwright/test'

testChatConformance({ placeholder: 'Send a message or type /fail', stopName: 'Stop' })

test('denies a forged action before confirmation and shows safe guidance', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('Send a message or type /fail')
  await input.fill('/restricted')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  await page.getByRole('button', { name: 'Run restricted action' }).click()
  await expect(page.getByRole('alert')).toContainText('missing-context')
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
})
