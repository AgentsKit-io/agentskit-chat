import { AgentChat } from '@agentskit/chat-react'
import { onboardingApplication, operationsApplication, supportChat, supportSession, unauthorizedOperationsApplication } from '@agentskit/chat-example-shared'

const onboarding = new URLSearchParams(window.location.search).get('reference') === 'onboarding'
const operations = new URLSearchParams(window.location.search).get('reference')?.startsWith('operations') === true
const operationsApp = new URLSearchParams(window.location.search).get('reference') === 'operations-unauthorized' ? unauthorizedOperationsApplication : operationsApplication

export const App = () => (
  <main>
    <header>
      <p className="eyebrow">{operations ? 'Northstar · Operations console' : onboarding ? 'Northstar · Guided setup' : 'Northstar Support · Online'}</p>
      <h1>{operations ? 'Inspect safely. Change deliberately.' : onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</h1>
      <p className="lede">{operations ? <>Type <code>/operations</code> to inspect or restart a protected service.</> : onboarding ? <>Type <code>/onboarding</code> to begin a deterministic, revisable setup.</> : <>Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.</>}</p>
    </header>
    {operations
      ? <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
      : onboarding
      ? <AgentChat definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
      : <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />}
  </main>
)
