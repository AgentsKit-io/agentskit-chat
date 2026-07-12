# Devtools package handoff

`packages/devtools` owns application-only trace capture, composition with upstream replay cassettes, and framework-neutral semantic parity reports.

- Never record adapter requests/chunks or implement replay; use `@agentskit/eval/replay`.
- Never execute actions or tools from a fixture.
- Trace details are bounded JSON and configured sensitive keys are redacted recursively.
- Parents must precede children and sequence values remain contiguous.
- Renderer parity compares semantic outcomes, never markup or pixels.

```bash
pnpm --filter @agentskit/chat-devtools lint
pnpm --filter @agentskit/chat-devtools test
pnpm --filter @agentskit/chat-devtools build
```
