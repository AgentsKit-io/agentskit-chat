---
"@agentskit/chat": patch
---

Use the published `@agentskit/net` bounded JSON reader and signal composition in the server subpath while preserving existing request diagnostics. Arbitrary callback promises retain the current abort boundary until the published network package exposes a generic timeout wrapper.
