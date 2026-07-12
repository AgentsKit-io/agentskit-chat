# React example handoff

## Ownership

`apps/example-react` hosts the shared support, onboarding, and protected operations references selected by query parameter. Domain behavior stays in `example-shared`.

## Checks

```bash
pnpm --filter @agentskit/chat-example-react build
pnpm test:e2e
```
