# Vue package handoff

## Ownership

`packages/vue` owns only the Vue application shell, native scoped slots, semantic theme mapping, and `ChoiceList` presentation. It consumes `useChat`, `ChatRoot`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation` from `@agentskit/vue@0.4.4`.

Do not add another controller, reactive chat store, stream consumer, lifecycle implementation, confirmation engine, or renderer root. Generic Vue binding gaps belong upstream in `AgentsKit-io/agentskit` first.

## Read first

- [`../../getting-started/vue.md`](../../getting-started/vue.md)
- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)

## Checks

```bash
pnpm --filter @agentskit/chat-vue lint
pnpm --filter @agentskit/chat-vue test
pnpm --filter @agentskit/chat-vue build
```
