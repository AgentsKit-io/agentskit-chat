# Ink package handoff

## Owner

`packages/ink` owns only the application-level Ink composition, native `ChoiceList` input/presentation, generic `StandardComponent`, and rendering of the shared semantic text fallback from ADR-0003/ADR-0007/ADR-0015. Only the latest unresolved component in a transcript owns terminal input.

## Upstream boundary

Use `useChat`, `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, and `ToolConfirmation` from published `@agentskit/ink`. Keyboard editing, history, lifecycle, streaming, cancellation, and confirmation UI must remain upstream. Typed action proposal requires `@agentskit/ink` 0.10.0 or newer.

Map supported semantic colors through the upstream `InkThemeProvider`; do not imitate unsupported spatial tokens in terminal output. Slots remain Ink components and must preserve single-owner keyboard input. Fully headless state uses upstream `useChat` directly.

Lifecycle slash commands are consumed through upstream `InputBar.onSubmitInput` and call `ChatReturn` directly. Escape cancellation remains owned by `@agentskit/ink`.

## Checks

```bash
pnpm --filter @agentskit/chat-ink lint
pnpm --filter @agentskit/chat-ink test
pnpm --filter @agentskit/chat-ink build
```
