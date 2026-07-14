# DOM renderer parity examples

React, Vue, Svelte, and Solid each host the **same** framework-neutral
definitions from `@agentskit/chat-example-shared`. App packages own only native
bootstrapping, theming chrome, and query-parameter routing.

| App | Package | Dev | Proof |
|-----|---------|-----|-------|
| React | `@agentskit/chat-example-react` | `pnpm --filter @agentskit/chat-example-react dev` | Playwright project `react` |
| Vue | `@agentskit/chat-example-vue` | `pnpm --filter @agentskit/chat-example-vue dev` | Playwright project `vue` |
| Svelte | `@agentskit/chat-example-svelte` | `pnpm --filter @agentskit/chat-example-svelte dev` | package + app build |
| Solid | `@agentskit/chat-example-solid` | `pnpm --filter @agentskit/chat-example-solid dev` | package + app build |

Query parameters (all DOM examples):

| Query | Reference |
|-------|-----------|
| _(default)_ | [Support](./support-reference.md) |
| `?reference=onboarding` | [Onboarding](./onboarding-reference.md) |
| `?reference=operations` | [Operations](./operations-reference.md) |
| `?reference=operations-unauthorized` | Unauthorized operations denial |
| `?reference=rag` | [Cited RAG](./rag-reference.md) |

Angular remains covered by the package conformance and agent-chat suite under
`packages/angular`. A full Angular example app is deferred to keep the monorepo
build free of an application-level Angular CLI graph; the shell package is still
part of the release matrix.

Ink and React Native keep their dedicated proof apps
(`@agentskit/chat-example-ink`, `@agentskit/chat-example-react-native`).
