import { onboardingApplication, supportChat, supportSession } from '@agentskit/chat-example-shared'
import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'
import React from 'react'

const onboarding = process.env.AK_EXAMPLE === 'onboarding'
render(onboarding
  ? <AgentChat definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
  : <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />)
