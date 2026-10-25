# Solid package handoff

`packages/solid` owns only the Solid application shell, typed render props, semantic CSS mapping, specialized `ChoiceList`, and generic native `StandardComponent`. It consumes `useChat`, `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation` from `@agentskit/solid@0.4.4`.

Never add another controller, reactive store, stream consumer, lifecycle implementation, confirmation engine, or container primitive. Config and session identity are isolated with keyed Solid owners. Owner cleanup delegates cancellation to the upstream binding fixed in AgentsKit #1169.

Checks: `pnpm --filter @agentskit/chat-solid lint && pnpm --filter @agentskit/chat-solid test && pnpm --filter @agentskit/chat-solid build`.


## Tests and fixtures

`packages/solid/tests` holds the package's Vitest suite. Its suite covers the shell and the shared protocol conformance corpus. `packages/solid/fixtures` holds the executable README example that the README-standard gate keeps in sync with the package README.
