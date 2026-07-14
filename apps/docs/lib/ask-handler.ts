import { createAskServiceHandler, type AskServiceGenerator, type AskServiceRetriever } from '@agentskit/chat-server'

export interface DocsAskAdapters {
  readonly retriever: AskServiceRetriever
  readonly generator: AskServiceGenerator
}

/** Host composition seam shared by hosted and self-hosted deployments. */
export const createDocsAskHandler = ({ retriever, generator }: DocsAskAdapters) => createAskServiceHandler({
  authenticate: () => ({ ok: true, context: { subjectId: 'anonymous-docs-user' } }),
  resolveSubjectId: context => context.subjectId,
  resolveSite: () => ({
    protocol: 'agentskit.chat.backend-site', version: 1, siteId: 'agentskit-chat-docs',
    assistant: { id: 'agentskit-chat-guide', name: 'AgentsKit Chat guide', suggestions: ['Which clients are supported?'] },
    corpus: { id: 'agentskit-chat-public', mode: 'local' },
    components: ['source-list'], actions: [],
    limits: { requestTimeoutMs: 30_000, retrievalTimeoutMs: 8_000, generationTimeoutMs: 20_000, maxSources: 5 },
    persistence: { mode: 'disabled' },
  }),
  retrievers: { local: retriever },
  generator,
})

export const unavailableAskResponse = () => new Response(JSON.stringify({
  error: { code: 'ASK_INTERNAL', message: 'The grounded Ask backend is not configured for this deployment.', retryable: false },
}), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
