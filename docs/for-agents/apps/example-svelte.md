# Svelte example handoff

## Ownership

`apps/example-svelte` hosts shared support, onboarding, protected operations, and
cited RAG references selected by query parameter. Domain behavior stays in
`example-shared`. This package owns only Svelte 5 bootstrapping and query routing.

## Checks

```bash
pnpm --filter @agentskit/chat-example-svelte lint
pnpm --filter @agentskit/chat-example-svelte build
```
