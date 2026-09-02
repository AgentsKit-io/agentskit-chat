import {
  StandardComponentCatalog,
  createAskAdapter,
  createAskSessionMemory,
  createDeterministicAnswerAdapter,
  defineChat,
  defineComponentManifest,
} from '@agentskit/chat'
import { verifiedKnowledgeArtifact } from './knowledge'

const endpoint = process.env.NEXT_PUBLIC_ASK_ENDPOINT?.trim() || '/api/ask'
const ask = createAskAdapter({ endpoint, corpus: 'agentskit-chat-public', persona: 'agentskit-chat-guide' })
const memory = createAskSessionMemory({ key: 'agentskit-chat:docs:v1', maxMessages: 20 })
const adapter = createDeterministicAnswerAdapter({
  artifact: verifiedKnowledgeArtifact,
  expectedContentHash: verifiedKnowledgeArtifact?.contentHash ?? 'sha256:252094f4de55723728323bc8426d77b189b154091ae4f4503c898d0028ded2f5',
  expectedSiteId: 'agentskit-chat-docs',
  fallbackMode: 'backend',
  fallback: ask,
  backend: { provider: 'host-configured', model: 'host-configured' },
})

export const docsChatDefinition = defineChat({
  id: 'agentskit-chat-docs',
  revision: 1,
  components: defineComponentManifest(StandardComponentCatalog),
  chat: { adapter, memory },
  choiceSubmission: adapter.resolveChoiceSubmission,
})
