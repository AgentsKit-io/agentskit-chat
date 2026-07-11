# Chat package handoff

## Ownership

`packages/chat` owns only framework-neutral application definitions. `ChatDefinition.chat` is the upstream `ChatConfig`; do not mirror its fields or add a controller.

## Read first

- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
