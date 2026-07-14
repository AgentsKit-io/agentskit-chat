import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const createSupportChat = (adapter: AdapterFactory) => defineChat({
  id: 'support',
  chat: { adapter },
})
