import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@agentskit\/chat$/, replacement: source('../../packages/chat/src/index.ts') },
      { find: '@agentskit/chat/protocol', replacement: source('../../packages/protocol/src/index.ts') },
      { find: '@agentskit/chat/server', replacement: source('../../packages/server/src/index.ts') },
      { find: '@agentskit/chat/react', replacement: source('../../packages/react/src/index.tsx') },
      { find: '@agentskit/chat-protocol', replacement: source('../../packages/protocol/src/index.ts') },
    ],
  },
  test: { exclude: ['tests/e2e/**', 'node_modules/**'] },
})
