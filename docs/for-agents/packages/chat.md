# Chat package handoff

## Ownership

`packages/chat` owns framework-neutral application definitions and the validated semantic fallback envelope from ADR-0003. `ChatDefinition.chat` is the upstream `ChatConfig`; do not mirror its fields or add a controller.

## Read first

- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [`../../architecture/adrs/0003-semantic-fallback-envelope.md`](../../architecture/adrs/0003-semantic-fallback-envelope.md)
- [`../../architecture/adrs/0006-session-scoped-deterministic-conversation.md`](../../architecture/adrs/0006-session-scoped-deterministic-conversation.md)
- [`../../conversation/routes-and-state.md`](../../conversation/routes-and-state.md)

## Conversation boundary

`createChatSession` may wrap only the upstream adapter boundary. It must not consume streams, mutate controller state, execute tools, or persist messages. Route precedence is declaration order; transition targets come from the active state definition. Every renderer creates a fresh session per definition mount.

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
