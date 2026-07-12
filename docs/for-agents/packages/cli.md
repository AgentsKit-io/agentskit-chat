# CLI package handoff

`packages/cli` owns AgentsKit Chat application detection, safe file generation, and command UX.

- Reuse published AgentsKit/AgentsKit Chat packages in generated source.
- Never copy private upstream templates or overwrite a non-empty target.
- Keep CI non-interactive and diagnostics on stderr.
- The closed renderer matrix is React, React Native, Ink, Vue, Svelte, Solid, and Angular.
- Add each renderer to detection, templates, help/completion, golden, install, typecheck, and generated-test coverage together.
- `add component` owns contract/native file generation but never source-code registration or overwrite merging.

```bash
pnpm --filter @agentskit/chat-cli lint
pnpm --filter @agentskit/chat-cli test
pnpm --filter @agentskit/chat-cli build
```
