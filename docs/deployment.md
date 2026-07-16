# Deployment modes

The shared `ChatDefinition` is unchanged across deployment modes. Only the
adapter, trusted host context, storage, and native renderer vary.

## Canonical documentation portal

The repository's Fumadocs host lives in `apps/docs` and deploys as one Vercel
project at [chat.agentskit.io](https://chat.agentskit.io/docs). Configure that
project with `apps/docs` as its root directory and keep the canonical
production URL in `NEXT_PUBLIC_SITE_URL`. The committed
`apps/docs/vercel.json` pins the framework and deployment region; Vercel project
settings must not replace build or application behavior that belongs in source
control.

Deployments run through the manual `Docs deployment` GitHub workflow. Select
`preview` for an isolated deployment or `production` for promotion. The
workflow builds once, deploys the prebuilt artifact, and runs the complete
browser suite against the immutable deployment URL. Configure these protected
GitHub environments:

- `docs-preview` with `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`.
- `docs-production` with the same scoped secrets plus required reviewers.

Production promotion is a human decision. Approvers verify the maturity copy,
preview evidence, canonical/raw/search/sitemap/robots/LLM routes, deterministic
Ask, explicit unavailable behavior for an unconfigured grounded backend, and
the security-header smoke before approving the environment. Provider secrets
remain server-side and must never use a `NEXT_PUBLIC_` name.

Keep the previous successful production deployment available during promotion.
Rollback reassigns the production alias to that immutable deployment; DNS does
not need to change. Treat the custom domain as a separate reversible step after
preview approval.

## Web-standard server — recommended

Mount `createChatHandler` from `@agentskit/chat/server` in a Node, serverless,
or edge route that supports Web `Request`, `Response`, `ReadableStream`, and
`AbortSignal`. Authenticate before resolving a definition or parsing untrusted
input. Keep provider keys, authorization, tenant context, durable storage, and
audit sinks on the server.

### Host adapter recipes

`createChatHandler` already speaks the Web Fetch API. Host frameworks only need
to forward the request and return the response.

#### Next.js App Router

```ts
// app/api/chat/route.ts
import { createChatHandler } from '@agentskit/chat/server'
import { verifyBearer } from '@/lib/auth'
import { chats } from '@/lib/chats'
import { sessions } from '@/lib/session-storage'

const handler = createChatHandler({
  authenticate: async request => {
    const identity = await verifyBearer(request)
    return identity
      ? { ok: true, context: identity }
      : { ok: false, response: new Response('Unauthorized', { status: 401 }) }
  },
  resolveDefinition: context => chats.forTenant(context?.tenantId),
  sessionStorage: context => sessions.forTenant(context?.tenantId),
})

export const POST = (request: Request) => handler(request)
```

#### Hono

```ts
import { Hono } from 'hono'
import { createChatHandler } from '@agentskit/chat/server'

const chat = createChatHandler({ /* authenticate, resolveDefinition, sessionStorage */ })
const app = new Hono()
app.post('/api/chat', c => chat(c.req.raw))
export default app
```

#### Express (Node 18+)

```ts
import express from 'express'
import { createChatHandler } from '@agentskit/chat/server'

const chat = createChatHandler({ /* … */ })
const app = express()

app.post('/api/chat', async (req, res) => {
  const disconnected = new AbortController()
  const abort = () => { if (!res.writableEnded) disconnected.abort() }
  req.once('aborted', abort)
  res.once('close', abort)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value)
      else if (Array.isArray(value)) value.forEach(item => headers.append(key, item))
    }
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: 'POST',
      headers,
      body: req,
      duplex: 'half',
      signal: disconnected.signal,
    } as RequestInit)
    const response = await chat(request)
    reader = response.body?.getReader()
    res.status(response.status)
    response.headers.forEach((value, key) => res.setHeader(key, value))
    if (!reader) return res.end()
    while (true) {
      const result = await reader.read()
      if (result.done) break
      res.write(result.value)
    }
    res.end()
  } finally {
    if (disconnected.signal.aborted) await reader?.cancel().catch(() => undefined)
    req.removeListener('aborted', abort)
    res.removeListener('close', abort)
  }
})
```

#### Cloudflare Worker

```ts
import { createChatHandler } from '@agentskit/chat/server'

const chat = createChatHandler({ /* … */ })

export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/api/chat') return chat(request)
    return new Response('Not found', { status: 404 })
  },
}
```

Mount `createAskServiceHandler` beside it when deterministic misses need cited
semantic retrieval. Hosted routes and self-hosted Node bridges import the same
factory; only the thin HTTP bridge varies. See the
[Ask backend deployment guide](./backend.md).

## Direct trusted runtime

A server process, desktop main process, or controlled terminal may inject an
AgentsKit adapter directly into `defineChat`. Browser and mobile clients must
not receive provider secrets. Use a server adapter or the shared Ask adapter
for those clients.

## Browser and SSR hosts

React, Vue, Svelte, Solid, and Angular use their native renderer package. Keep
the definition in a framework-neutral module. SSR may render the shell, but a
chat session starts only where the selected AgentsKit binding and transport are
available. Persist messages through an upstream `ChatMemory`; AgentsKit Chat
session storage contains application metadata, not a second message history.

DOM parity demos for React, Vue, Svelte, and Solid live under `apps/example-*`
and share `@agentskit/chat-example-shared`.

## React Native / Expo

Use `@agentskit/chat/react-native` and call a trusted backend. Storage,
navigation, safe-area layout, and platform permissions stay host-owned. The
release gate exercises native-mobile accessibility contracts and Expo web/iOS
production bundles.

## Ink / terminal

Use `@agentskit/chat/ink` in an interactive TTY. Unsupported visual components
render their validated semantic fallback. The PTY gate covers keyboard submit,
choice, confirmation, lifecycle, stop, focus, and exit behavior.

## Deterministic and degraded operation

Deterministic routes and verified local answer artifacts may resolve without a
model. Unknown input delegates to the injected AgentsKit adapter when policy
allows. Configure explicit offline/escalation behavior; never silently invent
an answer when a required backend is unavailable.

See [server details](./server.md), [Ask backend](./backend.md), [sessions](./sessions.md), and the
[security policy](../SECURITY.md).
