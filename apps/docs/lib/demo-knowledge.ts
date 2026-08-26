import {
  createAssistantContentEncoder,
  ASSISTANT_CONTENT_PREFIX,
  COMPONENT_PROTOCOL,
  COMPONENT_PROTOCOL_VERSION,
  computeLocalKnowledgeArtifactContentHash,
  verifyLocalKnowledgeArtifactSync,
  type ComponentRenderFrame,
  type LocalKnowledgeArtifact,
  type VerifiedLocalKnowledgeArtifact,
} from '@agentskit/chat/protocol'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import {
  createDeterministicAnswerAdapter,
  defineComponentManifest,
  StandardComponentCatalog,
  type ComponentDefinition,
  type DeterministicAnswerAdapter,
} from '@agentskit/chat'
import { z } from 'zod'

export const DEMO_PROMPTS = [
  'hi',
  'how can I call you?',
  'toggle the mode',
  'what day is today',
] as const

export const DEMO_SURPRISE_PROMPT = 'Surprise me' as const

export const DEMO_DATE_CARD_KEY = 'demo-date-card' as const

export const DateCardPropsSchema = z.object({
  weekday: z.string().min(1).max(32),
  month: z.string().min(1).max(32),
  day: z.string().min(1).max(2),
  year: z.string().regex(/^\d{4}$/),
  timezone: z.string().min(1).max(128),
}).strict().readonly()

export type DateCardProps = z.infer<typeof DateCardPropsSchema>

export const DateCardComponent: ComponentDefinition<DateCardProps> = {
  key: DEMO_DATE_CARD_KEY,
  propsSchema: DateCardPropsSchema,
  accessibility: { role: 'status', keyboard: false, live: 'polite' },
  capabilities: ['display'],
  fallback: props => `Today is ${props.weekday}, ${props.month} ${props.day}, ${props.year}.`,
}

export const demoComponentManifest = defineComponentManifest([
  ...StandardComponentCatalog,
  DateCardComponent,
])

const unsignedArtifact = {
  protocol: 'agentskit.chat.knowledge',
  version: 1,
  artifactId: 'agentskit-chat-deterministic-demo-v1',
  siteId: 'agentskit-chat-deterministic-demo',
  generatedAt: '2026-08-25T00:00:00.000Z',
  entries: [
    {
      id: 'hello',
      kind: 'restricted-faq',
      label: 'Hello',
      match: { type: 'exact', values: ['hi', 'hello'] },
      answer: { markdown: 'Hi. I am AgentsKit Chat — and I know when not to guess.', citations: [] },
    },
    {
      id: 'call-me',
      kind: 'restricted-faq',
      label: 'How to call me',
      match: { type: 'exact', values: ['how can I call you?', 'what should I call you?'] },
      answer: { markdown: 'Call me AgentsKit Chat.', citations: [] },
    },
    {
      id: 'toggle-theme',
      kind: 'restricted-faq',
      label: 'Toggle the mode',
      match: { type: 'exact', values: ['toggle the mode', 'toggle dark mode'] },
      answer: { markdown: 'Theme toggled locally. No model call required.', citations: [] },
    },
    {
      id: 'today',
      kind: 'restricted-faq',
      label: 'What day is today',
      match: { type: 'exact', values: ['what day is today', "what's the date today", 'today'] },
      answer: { markdown: 'Here is today, resolved from the browser clock — deterministic and local.', citations: [] },
    },
  ],
} as const satisfies Omit<LocalKnowledgeArtifact, 'contentHash'>

export const DEMO_KNOWLEDGE_HASH = 'sha256:dbd24c4b6278c690c344c56773ddbb0e19f3e0bbbc458ce5978f1d33ef401694' as const

export const demoKnowledgeArtifact = {
  ...unsignedArtifact,
  contentHash: DEMO_KNOWLEDGE_HASH,
} as const satisfies LocalKnowledgeArtifact

const verification = verifyLocalKnowledgeArtifactSync(demoKnowledgeArtifact, {
  expectedContentHash: DEMO_KNOWLEDGE_HASH,
  expectedSiteId: unsignedArtifact.siteId,
})

export const verifiedDemoKnowledgeArtifact: VerifiedLocalKnowledgeArtifact | null = verification.ok ? verification.value : null

export const demoKnowledgeHashInput = unsignedArtifact

const latestUserInput = (request: AdapterRequest): string => request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''

const dateFrame = (): ComponentRenderFrame => {
  const date = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: '2-digit', year: 'numeric',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  const props = DateCardPropsSchema.parse({
    weekday: value.weekday ?? 'Today',
    month: value.month ?? 'Month',
    day: value.day ?? '01',
    year: value.year ?? String(date.getFullYear()),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time',
  })
  return {
    protocol: COMPONENT_PROTOCOL,
    version: COMPONENT_PROTOCOL_VERSION,
    type: 'render',
    componentKey: DEMO_DATE_CARD_KEY,
    instanceId: `date-${date.getTime()}`,
    props,
    fallback: { kind: DEMO_DATE_CARD_KEY, summary: DateCardComponent.fallback?.(props) ?? 'Today.' },
  }
}

const withDateCard = (base: DeterministicAnswerAdapter): DeterministicAnswerAdapter => {
  const createSourceForSession = (request: AdapterRequest, sessionId: string): StreamSource => {
    const source = base.createSourceForSession(request, sessionId)
    const isDateQuery = latestUserInput(request).trim().toLowerCase() === 'what day is today'
    if (!isDateQuery) return source
    let aborted = false
    return {
      abort() { aborted = true; source.abort() },
      async *stream(): AsyncIterableIterator<StreamChunk> {
        let local = false
        for await (const chunk of source.stream()) {
          if (aborted) return
          if (chunk.type === 'text' && chunk.metadata?.answer !== undefined) local = true
          if (chunk.type === 'done') {
            if (local) {
              const encoder = createAssistantContentEncoder()
              yield { type: 'text', content: encoder.encode({ kind: 'component', frame: dateFrame() }).slice(ASSISTANT_CONTENT_PREFIX.length) }
            }
          }
          yield chunk
        }
      },
    }
  }
  return {
    ...base,
    createSource: request => createSourceForSession(request, 'unscoped'),
    createSourceForSession,
  }
}

const withThinkingDelay = (base: DeterministicAnswerAdapter): DeterministicAnswerAdapter => {
  const createSourceForSession = (request: AdapterRequest, sessionId: string): StreamSource => {
    const source = base.createSourceForSession(request, sessionId)
    let aborted = false
    return {
      abort() { aborted = true; source.abort() },
      async *stream(): AsyncIterableIterator<StreamChunk> {
        await new Promise(resolve => setTimeout(resolve, 520))
        if (aborted) return
        yield* source.stream()
      },
    }
  }
  return {
    ...base,
    createSource: request => createSourceForSession(request, 'unscoped'),
    createSourceForSession,
  }
}

export const createDemoDeterministicAdapter = ({
  fallback,
  onDecision,
}: {
  readonly fallback: AdapterFactory
  readonly onDecision?: (decision: Parameters<NonNullable<Parameters<typeof createDeterministicAnswerAdapter>[0]['onDecision']>>[0]) => void
}): DeterministicAnswerAdapter => withThinkingDelay(withDateCard(createDeterministicAnswerAdapter({
  artifact: verifiedDemoKnowledgeArtifact,
  expectedContentHash: DEMO_KNOWLEDGE_HASH,
  expectedSiteId: unsignedArtifact.siteId,
  fallbackMode: 'backend',
  fallback,
  backend: { provider: 'OpenRouter', model: 'free fallback chain' },
  ...(onDecision === undefined ? {} : { onDecision }),
})))

export const createDemoDateFrame = dateFrame

export const computeDemoKnowledgeHash = (): Promise<string> => computeLocalKnowledgeArtifactContentHash(demoKnowledgeHashInput)
