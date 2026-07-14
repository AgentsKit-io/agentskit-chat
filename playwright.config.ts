import { defineConfig, type PlaywrightTestConfig } from '@playwright/test'

const servers: NonNullable<PlaywrightTestConfig['webServer']> = [
  {
    command: 'pnpm --filter @agentskit/chat-example-react dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  {
    command: 'pnpm --filter @agentskit/chat-example-react-native dev:web --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  {
    command: 'pnpm --filter @agentskit/chat-example-vue dev --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  {
    command: 'pnpm --filter @agentskit/chat-docs start --hostname 127.0.0.1 --port 4180',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  projects: [
    { name: 'react', testMatch: /react-hello-world/, use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'react-native', testMatch: /react-native-hello-world/, use: { baseURL: 'http://127.0.0.1:4174' } },
    { name: 'vue', testMatch: /vue-support/, use: { baseURL: 'http://127.0.0.1:4175' } },
    { name: 'docs', testDir: './apps/docs/tests/e2e', use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' } },
  ],
  webServer: servers,
})
