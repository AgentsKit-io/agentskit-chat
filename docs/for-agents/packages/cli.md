# CLI package handoff

`packages/cli` owns AgentsKit Chat application detection, safe file generation, and command UX.

- Reuse published AgentsKit/AgentsKit Chat packages in generated source.
- Never copy private upstream templates or overwrite a non-empty target.
- Keep CI non-interactive and diagnostics on stderr.
- Add each renderer to golden, install, typecheck, and generated-test coverage together.

```bash
pnpm --filter @agentskit/chat-cli lint
pnpm --filter @agentskit/chat-cli test
pnpm --filter @agentskit/chat-cli build
```
