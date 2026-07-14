<script setup lang="ts">
import { AgentChat } from '@agentskit/chat/vue'
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
import { computed } from 'vue'

const reference = new URLSearchParams(window.location.search).get('reference')
const onboarding = reference === 'onboarding'
const operations = reference?.startsWith('operations') === true
const rag = reference === 'rag'
const operationsApp = reference === 'operations-unauthorized'
  ? unauthorizedOperationsApplication
  : operationsApplication

const eyebrow = computed(() =>
  rag ? 'Northstar · Grounded knowledge'
    : operations ? 'Northstar · Operations console'
      : onboarding ? 'Northstar · Guided setup'
        : 'Northstar Support · Online')

const title = computed(() =>
  rag ? 'Answers grounded in sources you can inspect.'
    : operations ? 'Inspect safely. Change deliberately.'
      : onboarding ? 'Build a workspace around the way you work.'
        : 'Answers now. A human when you need one.')

const lede = computed(() =>
  rag ? 'Ask a documentation question to retrieve a cited answer.'
    : operations ? 'Type /operations to inspect or restart a protected service.'
      : onboarding ? 'Type /onboarding to begin a deterministic, revisable setup.'
        : 'Ask a product question, or type /support to open a ticket through a confirmed, policy-protected action.')

const onRagInteract = (event: ComponentInteractionEvent) => {
  const url = ragChat.resolveSourceInteraction(event)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <main>
    <header>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="lede">
        <template v-if="operations">Type <code>/operations</code> to inspect or restart a protected service.</template>
        <template v-else-if="onboarding">Type <code>/onboarding</code> to begin a deterministic, revisable setup.</template>
        <template v-else-if="rag">{{ lede }}</template>
        <template v-else>Ask a product question, or type <code>/support</code> to open a ticket through a confirmed, policy-protected action.</template>
      </p>
    </header>
    <AgentChat
      v-if="rag"
      :definition="ragChat"
      :session="ragSession"
      placeholder="Ask a grounded question"
      :on-component-interact="onRagInteract"
    />
    <AgentChat
      v-else-if="operations"
      :definition="operationsApp.definition"
      :session="operationsApp.session"
      placeholder="Type /operations to begin"
    />
    <AgentChat
      v-else-if="onboarding"
      :definition="onboardingApplication.definition"
      :session="onboardingApplication.session"
      placeholder="Type /onboarding to begin"
      :on-component-interact="onboardingApplication.onComponentInteract"
      :on-component-select="onboardingApplication.onComponentSelect"
    />
    <AgentChat
      v-else
      :definition="supportChat"
      :session="supportSession"
      placeholder="Ask support or type /support"
    />
  </main>
</template>
