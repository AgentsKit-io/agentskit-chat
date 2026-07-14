# Solid example handoff

## Ownership

`apps/example-solid` hosts shared support, onboarding, protected operations, and
cited RAG references selected by query parameter. Domain behavior stays in
`example-shared`. This package owns only Solid bootstrapping and query routing.

## Checks

```bash
pnpm --filter @agentskit/chat-example-solid lint
pnpm --filter @agentskit/chat-example-solid build
```
