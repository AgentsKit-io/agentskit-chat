import { AgentChat } from '@agentskit/chat/solid'
import {
  onboardingApplication,
  operationsApplication,
  ragChat,
  ragSession,
  supportChat,
  supportSession,
  unauthorizedOperationsApplication,
} from '@agentskit/chat-example-shared'
import type { Component } from 'solid-js'
import { Match, Switch } from 'solid-js'

const reference = new URLSearchParams(window.location.search).get('reference')
const onboarding = reference === 'onboarding'
const operations = reference?.startsWith('operations') === true
const rag = reference === 'rag'
const operationsApp = reference === 'operations-unauthorized'
  ? unauthorizedOperationsApplication
  : operationsApplication

export const App: Component = () => (
  <main>
    <header>
      <p class="eyebrow">{rag ? 'Northstar · Grounded knowledge' : operations ? 'Northstar · Operations console' : onboarding ? 'Northstar · Guided setup' : 'Northstar Support · Online'}</p>
      <h1>{rag ? 'Answers grounded in sources you can inspect.' : operations ? 'Inspect safely. Change deliberately.' : onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</h1>
      <p class="lede">{rag
        ? 'Ask a documentation question to retrieve a cited answer.'
        : operations
          ? <>Type <code>/operations</code> to inspect or restart a protected service.</>
          : onboarding
            ? <>Type <code>/onboarding</code> to begin a deterministic, revisable setup.</>
            : <>Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.</>}</p>
    </header>
    <Switch>
      <Match when={rag}>
        <AgentChat definition={ragChat} session={ragSession} placeholder="Ask a grounded question" onComponentInteract={event => {
          const url = ragChat.resolveSourceInteraction(event)
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
        }} />
      </Match>
      <Match when={operations}>
        <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
      </Match>
      <Match when={onboarding}>
        <AgentChat
          definition={onboardingApplication.definition}
          session={onboardingApplication.session}
          placeholder="Type /onboarding to begin"
          onComponentInteract={onboardingApplication.onComponentInteract}
          onComponentSelect={onboardingApplication.onComponentSelect}
        />
      </Match>
      <Match when={true}>
        <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />
      </Match>
    </Switch>
  </main>
)
