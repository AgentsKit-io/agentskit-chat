import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

const deterministicAdapter: AdapterFactory = {
  createSource: request => {
    let aborted = false
    let release: (() => void) | undefined
    return {
      async *stream() {
        const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
        if (prompt === '/fail') {
          yield { type: 'error', content: 'The deterministic adapter failed as requested.' }
          return
        }
        if (prompt === '/slow') await new Promise<void>(resolve => { release = resolve })
        if (!aborted) yield { type: 'text', content: `AgentsKit received: ${prompt}` }
        if (!aborted) yield { type: 'done' }
      },
      abort() {
        aborted = true
        release?.()
      },
    }
  },
}

export const helloWorldChat = defineChat({
  id: 'hello-world',
  chat: { adapter: deterministicAdapter },
})
