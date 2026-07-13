# @agentskit/chat-server

Web-standard request handler for AgentsKit Chat definitions. It composes the canonical AgentsKit controller and memory with AgentsKit Chat protocol/session contracts.

```ts
const POST = createChatHandler({
  authenticate: async request => ({ ok: true, context: await authenticate(request) }),
  resolveDefinition: context => chats.forTenant(context.tenantId),
  sessionStorage: context => sessions.forTenant(context.tenantId),
})
```

The returned function accepts a standard `Request` and returns a standard streaming `Response`.

Semantic questions escalated by the deterministic plane use the trusted Ask
vertical:

```ts
const POST = createAskServiceHandler({
  authenticate,
  resolveSite,
  resolveSubjectId: identity => identity.subjectId,
  retrievers: { local: localRag, federated: federatedRag },
  generator,
  sessionStore,
  rateLimit,
  onMetric,
})
```

Site/corpus/assistant authority is resolved server-side. Successful responses
are cited Ask NDJSON; hosted and self-hosted routes mount the same factory. See
the [backend guide](../../docs/backend.md).
