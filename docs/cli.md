# CLI

```bash
agentskit-chat init my-chat --renderer react --yes
agentskit-chat init my-mobile-chat --renderer react-native --yes
agentskit-chat init my-terminal-chat --renderer ink --yes
```

Without `--renderer`, the command detects `expo`/`react-native`, `ink`, or `react` dependencies from the current host project while writing to the requested empty child directory. If detection is impossible, an interactive TTY asks once; non-interactive execution fails with an actionable flag.

Every starter contains a shared `src/chat.ts`, Web-standard `src/server.ts`, native renderer entry, strict TypeScript configuration, test, and README. The target path must not exist: the CLI never merges, deletes, or overwrites project files.

Generate native shell completion with `agentskit-chat completion bash`, `zsh`, or `fish`.

## Troubleshooting

- `RENDERER_REQUIRED`: add `--renderer react`, `react-native`, or `ink`.
- `TARGET_EXISTS`: choose a new target path that does not exist.
- `MANIFEST_INVALID`: repair `package.json` or use an explicit renderer and a new target path.
