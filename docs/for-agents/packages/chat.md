# Chat package handoff

## Ownership

`packages/chat` owns framework-neutral application definitions and the validated semantic fallback envelope from ADR-0003. `ChatDefinition.chat` is the upstream `ChatConfig`; do not mirror its fields or add a controller.

## Read first

- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [`../../architecture/adrs/0003-semantic-fallback-envelope.md`](../../architecture/adrs/0003-semantic-fallback-envelope.md)

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
