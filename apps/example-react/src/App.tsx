import { AgentChat } from '@agentskit/chat-react'
import { helloWorldChat } from '@agentskit/chat-example-shared'

export const App = () => (
  <main>
    <header>
      <p>AgentsKit Chat · React vertical slice</p>
      <h1>One definition. Native React.</h1>
    </header>
    <AgentChat definition={helloWorldChat} placeholder="Send a message or type /fail" />
  </main>
)
