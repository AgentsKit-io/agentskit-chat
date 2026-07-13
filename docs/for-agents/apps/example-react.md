# React example handoff

## Ownership

`apps/example-react` hosts shared support, onboarding, protected operations, and cited RAG references selected by query parameter. Domain behavior stays in `example-shared`.

## Checks

```bash
pnpm --filter @agentskit/chat-example-react build
pnpm test:e2e
```
