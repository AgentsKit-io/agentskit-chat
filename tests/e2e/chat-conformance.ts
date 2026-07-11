import { expect, test } from '@playwright/test'

interface ChatConformanceOptions {
  readonly placeholder: string
  readonly stopName: string
}

export const testChatConformance = ({ placeholder, stopName }: ChatConformanceOptions): void => {
  test('streams a deterministic answer', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(placeholder).fill('hello')
    await page.getByRole('button', { name: 'Send', exact: false }).click()
    await expect(page.getByText('AgentsKit received: hello').last()).toBeVisible()
  })

  test('announces adapter errors', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(placeholder).fill('/fail')
    await page.getByRole('button', { name: 'Send', exact: false }).click()
    await expect(page.getByRole('alert')).toContainText('failed as requested')
  })

  test('cancels an active response', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(placeholder).fill('/slow')
    await page.getByRole('button', { name: 'Send', exact: false }).click()
    await page.getByRole('button', { name: stopName, exact: true }).click()
    await expect(page.getByRole('button', { name: stopName, exact: true })).toBeHidden()
  })
}
