import { defineConfig } from '@playwright/test'

const externalBaseUrl = process.env.DOCS_BASE_URL?.trim()

export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  use: { baseURL: externalBaseUrl || 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  ...(externalBaseUrl ? {} : { webServer: {
    command: 'pnpm build && pnpm start --hostname 127.0.0.1 --port 4180',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  } }),
})
