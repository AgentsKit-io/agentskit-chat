import { AgentChat } from '@agentskit/chat-react'
import { supportChat, supportSession } from '@agentskit/chat-example-shared'

export const App = () => (
  <main>
    <header>
      <p className="eyebrow">Northstar Support · Online</p>
      <h1>Answers now. A human when you need one.</h1>
      <p className="lede">Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.</p>
    </header>
    <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />
  </main>
)
