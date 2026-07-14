import { defineChat } from '@agentskit/chat'

export const definition = defineChat({
  id: 'support',
  chat: { id: 'support', model: 'mock/demo' },
})