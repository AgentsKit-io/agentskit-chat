# React package handoff

## Ownership

`packages/react` supplies an accessible application shell, specialized `ChoiceList`, and generic native `StandardComponent` presentation over `useChat` and headless components from `@agentskit/react`. Shared frames, manifests, props, and events remain framework-neutral. It must not implement chat state, streaming, cancellation, message persistence, or adapter behavior.

Retry, edit, regenerate, and stop controls must call the corresponding `ChatReturn` methods directly. Do not reproduce truncation, lineage, abort, or late-chunk behavior in this package.

Typed actions compose the published upstream `ToolConfirmation`; approval and denial go through the shared session coordinator and then the upstream hook.

Semantic themes map only to published upstream CSS variables. Native slots stay in this package; fully headless state uses `useChat` from `@agentskit/react` directly. Preserve the default shell's log, alert, labeling, and keyboard semantics when replacing slots.

## Read first

- [`../../getting-started/react.md`](../../getting-started/react.md)
- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)

## Public surface

Consumers install the consolidated package and import the React renderer subpath:

```bash
npm install @agentskit/chat@0.3.0 @agentskit/react react
```

```ts
import { AgentChat } from '@agentskit/chat/react'
```

Do not document or reintroduce the retired public package name `@agentskit/chat-react`
for new hosts. Source still lives under `packages/react` for workspace builds.

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
