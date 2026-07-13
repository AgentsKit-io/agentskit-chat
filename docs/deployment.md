# Deployment modes

The shared `ChatDefinition` is unchanged across deployment modes. Only the
adapter, trusted host context, storage, and native renderer vary.

## Web-standard server — recommended

Mount `createChatHandler` in a Node, serverless, or edge route that supports
Web `Request`, `Response`, `ReadableStream`, and `AbortSignal`. Authenticate
before resolving a definition or parsing untrusted input. Keep provider keys,
authorization, tenant context, durable storage, and audit sinks on the server.

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

## React Native / Expo

Use `@agentskit/chat-react-native` and call a trusted backend. Storage,
navigation, safe-area layout, and platform permissions stay host-owned. The
release gate exercises native-mobile accessibility contracts and Expo web/iOS
production bundles.

## Ink / terminal

Use `@agentskit/chat-ink` in an interactive TTY. Unsupported visual components
render their validated semantic fallback. The PTY gate covers keyboard submit,
choice, confirmation, lifecycle, stop, focus, and exit behavior.

## Deterministic and degraded operation

Deterministic routes and verified local answer artifacts may resolve without a
model. Unknown input delegates to the injected AgentsKit adapter when policy
allows. Configure explicit offline/escalation behavior; never silently invent
an answer when a required backend is unavailable.

See [server details](./server.md), [sessions](./sessions.md), and the
[security policy](../SECURITY.md).
