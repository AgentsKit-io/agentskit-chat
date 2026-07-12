import { AgentChat } from '@agentskit/chat-react'
import { onboardingApplication, supportChat, supportSession } from '@agentskit/chat-example-shared'

const onboarding = new URLSearchParams(window.location.search).get('reference') === 'onboarding'

export const App = () => (
  <main>
    <header>
      <p className="eyebrow">{onboarding ? 'Northstar · Guided setup' : 'Northstar Support · Online'}</p>
      <h1>{onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</h1>
      <p className="lede">{onboarding ? <>Type <code>/onboarding</code> to begin a deterministic, revisable setup.</> : <>Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.</>}</p>
    </header>
    {onboarding
      ? <AgentChat definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
      : <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />}
  </main>
)
