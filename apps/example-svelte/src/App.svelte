<script lang="ts">
  import { AgentChat } from '@agentskit/chat/svelte'
  import type { ComponentInteractionEvent } from '@agentskit/chat-protocol'
  import {
    onboardingApplication,
    operationsApplication,
    ragChat,
    ragSession,
    supportChat,
    supportSession,
    unauthorizedOperationsApplication,
  } from '@agentskit/chat-example-shared'

  const reference = new URLSearchParams(window.location.search).get('reference')
  const onboarding = reference === 'onboarding'
  const operations = reference?.startsWith('operations') === true
  const rag = reference === 'rag'
  const operationsApp = reference === 'operations-unauthorized'
    ? unauthorizedOperationsApplication
    : operationsApplication

  const onRagInteract = (event: ComponentInteractionEvent) => {
    const url = ragChat.resolveSourceInteraction(event)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }
</script>

<main>
  <header>
    <p class="eyebrow">{rag ? 'Northstar · Grounded knowledge' : operations ? 'Northstar · Operations console' : onboarding ? 'Northstar · Guided setup' : 'Northstar Support · Online'}</p>
    <h1>{rag ? 'Answers grounded in sources you can inspect.' : operations ? 'Inspect safely. Change deliberately.' : onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</h1>
    <p class="lede">
      {#if rag}
        Ask a documentation question to retrieve a cited answer.
      {:else if operations}
        Type <code>/operations</code> to inspect or restart a protected service.
      {:else if onboarding}
        Type <code>/onboarding</code> to begin a deterministic, revisable setup.
      {:else}
        Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.
      {/if}
    </p>
  </header>
  {#if rag}
    <AgentChat definition={ragChat} session={ragSession} placeholder="Ask a grounded question" onComponentInteract={onRagInteract} />
  {:else if operations}
    <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
  {:else if onboarding}
    <AgentChat
      definition={onboardingApplication.definition}
      session={onboardingApplication.session}
      placeholder="Type /onboarding to begin"
      onComponentInteract={onboardingApplication.onComponentInteract}
      onComponentSelect={onboardingApplication.onComponentSelect}
    />
  {:else}
    <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />
  {/if}
</main>
