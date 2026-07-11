import { helloWorldChat } from '@agentskit/chat-example-shared'
import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'
import React from 'react'

render(<AgentChat definition={helloWorldChat} placeholder="Message AgentsKit" />)
