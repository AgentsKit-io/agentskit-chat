---
"@agentskit/chat": patch
"@agentskit/chat-cli": patch
---

Align `@agentskit/*` runtime dependencies to the latest published releases: eval 0.7, memory 0.12, net 0.2.3, statechart 0.3.2 and cross-platform 0.3.

The Svelte renderer now cancels an active stream on config replacement through the store's idempotent `destroy()`, so `@agentskit/svelte` 0.6 aborts the old source only once.
