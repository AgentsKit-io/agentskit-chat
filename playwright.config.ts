import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    { name: 'react', testMatch: /react-hello-world/, use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'react-native', testMatch: /react-native-hello-world/, use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @agentskit/chat-example-react dev --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @agentskit/chat-example-react-native dev:web --port 4174',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
