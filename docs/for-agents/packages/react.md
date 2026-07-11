# React package handoff

## Ownership

`packages/react` supplies an accessible application shell and native `ChoiceList` presentation over `useChat` and headless components from `@agentskit/react`. Shared frames, manifests, props, and events remain framework-neutral. It must not implement chat state, streaming, cancellation, message persistence, or adapter behavior.

## Read first

- [`../../getting-started/react.md`](../../getting-started/react.md)
- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)

## Checks

```bash
pnpm --filter @agentskit/chat-react lint
pnpm --filter @agentskit/chat-react test
```
