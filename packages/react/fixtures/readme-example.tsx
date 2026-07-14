import { AgentChat } from '@agentskit/chat-react'
import type { ChatDefinition } from '@agentskit/chat'

export const App = ({ definition }: { readonly definition: ChatDefinition }) =>
  <AgentChat definition={definition} placeholder="Ask a question" />
