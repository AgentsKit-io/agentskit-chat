import { defineChat } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat-react'
import type { AdapterFactory } from '@agentskit/core'

const deterministicAdapter: AdapterFactory = {
  createSource: request => {
    let aborted = false
    return {
      async *stream() {
        const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
        if (prompt === '/fail') {
          yield { type: 'error', content: 'The deterministic adapter failed as requested.' }
          return
        }
        if (!aborted) yield { type: 'text', content: `AgentsKit received: ${prompt}` }
        if (!aborted) yield { type: 'done' }
      },
      abort() { aborted = true },
    }
  },
}

const chat = defineChat({ id: 'hello-world', chat: { adapter: deterministicAdapter } })

export const App = () => (
  <main>
    <header>
      <p>AgentsKit Chat · React vertical slice</p>
      <h1>One definition. Native React.</h1>
    </header>
    <AgentChat definition={chat} placeholder="Send a message or type /fail" />
  </main>
)
