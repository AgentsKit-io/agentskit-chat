# Web-standard server handler

`createChatHandler` mounts one shared chat definition behind the platform `Request`, `Response`, `ReadableStream`, and `AbortSignal` APIs.

```ts
const handleChat = createChatHandler({
  authenticate: async request => {
    const identity = await verifyBearer(request)
    return identity
      ? { ok: true, context: identity }
      : { ok: false, response: new Response('Unauthorized', { status: 401 }) }
  },
  resolveDefinition: context => chats.forTenant(context?.tenantId),
  sessionStorage: context => sessions.forTenant(context?.tenantId),
  timeoutMs: 30_000,
})
```

Send an encoded `client.turn.submit` event as `application/json`. A successful response is `application/x-ndjson`; every line is an encoded turn event and can be passed to `decodeTurnEvent` and a session-bound snapshot cursor.

Authentication completes before parsing untrusted JSON. Trusted context exists only in the host closure and is never read from the submit payload. Return a host-owned response for authentication failures.

Canonical messages remain in `definition.chat.memory`. Application metadata uses the CAS `SessionStorage` contract. The handler waits for the final canonical message save before closing a successful response.

`sessionStorage` is required because the persisted cursor, active-turn lease, and latest 64 terminal turns prevent sequence rollback, concurrent execution, and recent sequential replay of model/tool effects. Terminal outcomes distinguish `completed` from `indeterminate` when canonical memory could not be saved. The handler claims the turn through CAS before creating the controller and releases it only after bounded cleanup. State updates are coalesced to the latest full snapshot under backpressure.

The default body limit is 64 KiB and deadline is 30 seconds. Method, media type, body, event, timeout, cancellation, and internal failures use safe versioned diagnostics. Request abort, response cancellation, and timeout stop the upstream AgentsKit controller/source.

## Deployment

- Next/Remix/SvelteKit/edge: export the returned handler directly where Web handlers are supported.
- Node HTTP: translate the incoming request to `Request` and pipe the returned `Response.body`; the package test contains a reference bridge.
- Express/Hono adapters should remain thin and must forward disconnect cancellation.
