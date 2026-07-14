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
  expectedContentHash: verifiedKnowledgeArtifact?.contentHash ?? 'sha256:d80aa1918f799c7824de8ff3a2f32454d07da2b0c815ec04bfceda51f5624382',
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
