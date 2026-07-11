# Ink example handoff

`apps/example-ink` is the executable terminal proof for the unchanged `helloWorldChat` definition. It owns only Ink process startup and PTY verification.

The PTY suite must prove deterministic response output, Escape cancellation without process termination, and graceful Ctrl+C exit.

```bash
pnpm --filter @agentskit/chat-example-ink lint
pnpm --filter @agentskit/chat-example-ink test:pty
```
