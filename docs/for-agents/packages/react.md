# React package handoff

## Ownership

`packages/react` supplies an accessible application shell, specialized `ChoiceList`, and generic native `StandardComponent` presentation over `useChat` and headless components from `@agentskit/react`. Shared frames, manifests, props, and events remain framework-neutral. It must not implement chat state, streaming, cancellation, message persistence, or adapter behavior.

Retry, edit, regenerate, and stop controls must call the corresponding `ChatReturn` methods directly. Do not reproduce truncation, lineage, abort, or late-chunk behavior in this package.

Typed actions compose the published upstream `ToolConfirmation`; approval and denial go through the shared session coordinator and then the upstream hook.

Semantic themes map only to published upstream CSS variables. Native slots stay in this package; fully headless state uses `useChat` from `@agentskit/react` directly. Preserve the default shell's log, alert, labeling, and keyboard semantics when replacing slots.

## Read first

- [`../../getting-started/react.md`](../../getting-started/react.md)
- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)

## Checks

```bash
pnpm --filter @agentskit/chat-react lint
pnpm --filter @agentskit/chat-react test
```
