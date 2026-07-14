import {
  verifyLocalKnowledgeArtifactSync,
  type LocalKnowledgeArtifact,
  type VerifiedLocalKnowledgeArtifact,
} from '@agentskit/chat/protocol'

export const KNOWLEDGE_HASH = 'sha256:d80aa1918f799c7824de8ff3a2f32454d07da2b0c815ec04bfceda51f5624382' as const

export const localKnowledgeArtifact = {
  protocol: 'agentskit.chat.knowledge',
  version: 1,
  artifactId: 'agentskit-chat-docs-v1',
  siteId: 'agentskit-chat-docs',
  contentHash: KNOWLEDGE_HASH,
  generatedAt: '2026-07-14T00:00:00.000Z',
  entries: [
    {
      id: 'install-framework',
      kind: 'command',
      label: 'Install AgentsKit Chat',
      match: { type: 'exact', values: ['How do I install AgentsKit Chat?', 'install agentskit chat', 'getting started'] },
      answer: {
        markdown: 'Install the framework package for the shared definition and the renderer for your client. Start with the framework-specific guide.',
        citations: [{ id: 'getting-started', title: 'Getting started', href: '/docs/getting-started' }],
      },
    },
    {
      id: 'supported-clients',
      kind: 'ecosystem',
      label: 'Supported clients',
      match: { type: 'exact', values: ['Which clients are supported?', 'supported frameworks', 'supported clients'] },
      answer: {
        markdown: 'The same application definition can be rendered by React, React Native, Svelte, Vue, Angular, Solid, and Ink clients. Each binding publishes conformance evidence against the shared protocol.',
        citations: [{ id: 'compatibility', title: 'Release compatibility', href: '/docs/releases/compatibility' }],
      },
    },
    {
      id: 'backend-ownership',
      kind: 'document',
      label: 'Backend ownership',
      match: { type: 'exact', values: ['Who owns the backend?', 'backend architecture', 'self hosted backend'] },
      answer: {
        markdown: 'AgentsKit Chat owns the bounded Ask protocol and server projection. Hosts inject AgentsKit retrieval, generation, persistence, authentication, and rate limiting; the framework does not replace those upstream capabilities.',
        citations: [{ id: 'backend', title: 'Backend integration', href: '/docs/backend' }],
      },
    },
  ],
} as const satisfies LocalKnowledgeArtifact

const verification = verifyLocalKnowledgeArtifactSync(localKnowledgeArtifact, {
  expectedContentHash: KNOWLEDGE_HASH,
  expectedSiteId: 'agentskit-chat-docs',
})

export const verifiedKnowledgeArtifact: VerifiedLocalKnowledgeArtifact | null = verification.ok ? verification.value : null
export const knowledgeDiagnostic = verification.ok ? undefined : verification.diagnostic
