import { onboardingApplication, operationsApplication, ragChat, ragSession, supportChat, supportSession } from '@agentskit/chat-example-shared'
import { AgentChat } from '@agentskit/chat/ink'
import { render } from 'ink'
import React from 'react'
import { ControlledInkExample } from './controlled.js'

const onboarding = process.env.AK_EXAMPLE === 'onboarding'
const operations = process.env.AK_EXAMPLE === 'operations'
const rag = process.env.AK_EXAMPLE === 'rag'
const controlled = process.env.AK_EXAMPLE === 'controlled'
render(controlled
  ? <ControlledInkExample />
  : rag
  ? <AgentChat definition={ragChat} session={ragSession} onComponentInteract={event => { const url = ragChat.resolveSourceInteraction(event); if (url) process.stdout.write(`\nSource: ${url}\n`) }} placeholder="Ask a grounded question" />
  : operations
  ? <AgentChat definition={operationsApplication.definition} session={operationsApplication.session} placeholder="Type /operations to begin" />
  : onboarding
  ? <AgentChat definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
  : <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />)
