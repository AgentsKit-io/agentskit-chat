# React example handoff

## Ownership

`apps/example-react` demonstrates one deterministic vertical slice. Its local adapter exists only to make the example and tests reproducible; production users pass any supported AgentsKit adapter through `ChatConfig`.

## Checks

```bash
pnpm --filter @agentskit/chat-example-react build
pnpm test:e2e
```
