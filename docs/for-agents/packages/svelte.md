# Svelte package handoff

`packages/svelte` owns only the Svelte 5 application shell, typed snippets, semantic CSS mapping, specialized `ChoiceList`, and generic native `StandardComponent`. It consumes `createChatStore`, `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation` from `@agentskit/svelte@0.4.3`.

Never add another controller, store, stream consumer, lifecycle implementation, confirmation engine, or container primitive. The internal keyed binding calls the upstream `stop` action before replacing an actively streaming store and preserves application/session state.

Checks: `pnpm --filter @agentskit/chat-svelte lint && pnpm --filter @agentskit/chat-svelte test && pnpm --filter @agentskit/chat-svelte build`.
