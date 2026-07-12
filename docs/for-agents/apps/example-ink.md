# Ink example handoff

`apps/example-ink` is the executable terminal proof for unchanged support, onboarding, and protected operations definitions. It owns only Ink process startup and PTY verification.

The PTY suite must prove the confirmed ticket flow, deterministic response output, Escape cancellation without process termination, and graceful Ctrl+C exit.

```bash
pnpm --filter @agentskit/chat-example-ink lint
pnpm --filter @agentskit/chat-example-ink test:pty
```
