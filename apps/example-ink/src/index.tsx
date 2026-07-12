import { supportChat, supportSession } from '@agentskit/chat-example-shared'
import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'
import React from 'react'

render(<AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />)
