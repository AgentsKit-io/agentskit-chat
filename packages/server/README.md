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
