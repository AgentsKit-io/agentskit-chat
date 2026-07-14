import { createAskServiceHandler, type AskServiceHandlerOptions, type AskServiceRetriever } from '@agentskit/chat/server'

export type DocsAskHandlerOptions<TContext> = Omit<AskServiceHandlerOptions<TContext>, 'retrievers'> & {
  readonly retriever: AskServiceRetriever
}

/** Host composition seam shared by hosted and self-hosted deployments. */
export const createDocsAskHandler = <TContext>({ retriever, ...options }: DocsAskHandlerOptions<TContext>) => createAskServiceHandler({
  ...options,
  retrievers: { local: retriever },
})

export const unavailableAskResponse = () => new Response(JSON.stringify({
  error: { code: 'ASK_INTERNAL', message: 'The grounded Ask backend is not configured for this deployment.', retryable: false },
}), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
