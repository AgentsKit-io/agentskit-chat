# Chat package handoff

## Ownership

`packages/chat` owns framework-neutral application definitions, the closed component manifest, component props validation, and the semantic fallback API from ADR-0003/ADR-0007. `ChatDefinition.chat` is the upstream `ChatConfig`; do not mirror its fields or add a controller.

## Read first

- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [`../../architecture/adrs/0003-semantic-fallback-envelope.md`](../../architecture/adrs/0003-semantic-fallback-envelope.md)
- [`../../architecture/adrs/0006-session-scoped-deterministic-conversation.md`](../../architecture/adrs/0006-session-scoped-deterministic-conversation.md)
- [`../../architecture/adrs/0007-closed-application-component-manifest.md`](../../architecture/adrs/0007-closed-application-component-manifest.md)
- [`../../components/choice-list.md`](../../components/choice-list.md)
- [`../../conversation/routes-and-state.md`](../../conversation/routes-and-state.md)

## Conversation boundary

`createChatSession` may wrap only the upstream adapter boundary. It must not consume streams, mutate controller state, execute tools, or persist messages. Route precedence is declaration order; transition targets come from the active state definition. Every renderer creates a fresh session per definition mount.

## Component boundary

Model or route frames are untrusted. Resolve them against `definition.components`; unknown or invalid frames are inert. Selection events express intent only and never execute an action. Standard AgentsKit `UIElement` types remain upstream.

Actionable choices use `createActionConfirmation` and the released upstream `ChatReturn.proposeToolCall`. Never validate or execute tools locally. Confirmation handles bind application-session metadata; authentication and durable audit remain outside this package.

Authorization uses `createCapabilityPolicy` + `withActionPolicy`. Trusted context must come from a host closure, never a protocol frame or message. AgentsKit owns enforcement through `authorizeToolCall`; this package owns only capability composition and trace projection.

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
