import { createChatHandler } from '@agentskit/chat-server'

export const POST = createChatHandler({
  authenticate: async () => ({ ok: true, context: {} }),
  resolveDefinition: () => definition,
  sessionStorage: () => storage,
})