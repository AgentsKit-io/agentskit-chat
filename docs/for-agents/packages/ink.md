# Ink package handoff

## Owner

`packages/ink` owns only the application-level Ink composition and semantic text fallback.

## Upstream boundary

Use `useChat`, `ChatContainer`, `Message`, `InputBar`, and `ThinkingIndicator` from published `@agentskit/ink`. Keyboard editing, history, lifecycle, streaming, and cancellation must remain upstream. Escape cancellation requires `@agentskit/ink` 0.9.5 or newer, delivered by AgentsKit PR #1133.

## Checks

```bash
pnpm --filter @agentskit/chat-ink lint
pnpm --filter @agentskit/chat-ink test
pnpm --filter @agentskit/chat-ink build
```
