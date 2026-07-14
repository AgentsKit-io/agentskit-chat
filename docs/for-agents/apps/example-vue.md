# Vue example handoff

## Ownership

`apps/example-vue` hosts shared support, onboarding, protected operations, and
cited RAG references selected by query parameter. Domain behavior stays in
`example-shared`. This package owns only Vue bootstrapping and query routing.

## Read first

- [`../../examples/dom-renderer-parity.md`](../../examples/dom-renderer-parity.md)
- [`../../examples/support-reference.md`](../../examples/support-reference.md)
- [`../packages/vue.md`](../packages/vue.md)

## Checks

```bash
pnpm --filter @agentskit/chat-example-vue lint
pnpm --filter @agentskit/chat-example-vue build
pnpm test:e2e --project=vue
```
