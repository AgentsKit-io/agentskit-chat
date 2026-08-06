export const chatStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.agentskit.io/#organization',
      name: 'AgentsKit',
      url: 'https://www.agentskit.io',
      sameAs: ['https://github.com/AgentsKit-io'],
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': 'https://chat.agentskit.io/#software',
      name: 'AgentsKit Chat',
      description:
        'A cross-framework application layer for typed AI chat interfaces across web, mobile, and terminal.',
      url: 'https://chat.agentskit.io',
      codeRepository: 'https://github.com/AgentsKit-io/agentskit-chat',
      license: 'https://github.com/AgentsKit-io/agentskit-chat/blob/main/LICENSE',
      programmingLanguage: 'TypeScript',
      runtimePlatform: ['Node.js', 'Web browser'],
      author: { '@id': 'https://www.agentskit.io/#organization' },
    },
  ],
} as const

export const serializedChatStructuredData = JSON.stringify(chatStructuredData).replaceAll('<', '\\u003c')
