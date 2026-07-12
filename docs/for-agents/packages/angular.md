# Angular package handoff

`packages/angular` owns only the standalone Angular application shell, content-template composition, semantic CSS mapping, and native `ChoiceList`. It consumes `AgentskitChat`, `ChatContainerComponent`, `MessageComponent`, `InputBarComponent`, `ThinkingIndicatorComponent`, and `ToolConfirmationComponent` from `@agentskit/angular@0.4.4`.

Never add another controller, signal store, stream consumer, lifecycle implementation, confirmation engine, or container primitive. Each shell scopes the upstream service through its component provider. Config replacement and component destruction delegate cancellation to the upstream cleanup fixed in AgentsKit #1171/#1172.

Checks: `pnpm --filter @agentskit/chat-angular lint && pnpm --filter @agentskit/chat-angular test && pnpm --filter @agentskit/chat-angular build`.
