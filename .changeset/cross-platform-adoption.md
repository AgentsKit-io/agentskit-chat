---
"@agentskit/chat-cli": patch
---

`agentskit-chat init` moves the staged project into place with `renamePath` and cleans up with `removePath` from `@agentskit/cross-platform`, so Windows file locks (EBUSY/EPERM) no longer fail scaffolding.
