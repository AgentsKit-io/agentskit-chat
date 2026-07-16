---
title: CLI
description: Full agentskit-chat CLI reference — init, add component, completion.
---

# CLI

Install once (or use `pnpm dlx`):

```bash
pnpm add -g @agentskit/chat-cli
# or
pnpm dlx @agentskit/chat-cli@0.4.0 <command>
```

## Commands

| Command | Purpose |
| --- | --- |
| `agentskit-chat init [dir]` | Scaffold a complete chat project |
| `agentskit-chat add component <name>` | Generate a schema-backed component |
| `agentskit-chat completion <shell>` | Print shell completion script |
| `agentskit-chat --help` | Help |
| `agentskit-chat --version` | Version |

## `init`

```bash
agentskit-chat init [directory] --renderer <name> [--yes]
```

| Flag | Description |
| --- | --- |
| `[directory]` | Target path. Must **not** already exist. |
| `--renderer` | `react` · `vue` · `svelte` · `solid` · `angular` · `react-native` · `ink` |
| `--yes` | Non-interactive (required in CI) |

Without `--renderer`, the CLI detects the host package manager stack when unambiguous.
On a TTY it may prompt once. Non-interactive runs fail with an actionable message.

**Creates:** shared `src/chat.ts`, Web-standard `src/server.ts`, native shell entry,
TypeScript config, test, README. Never merges or overwrites existing files.

Examples:

```bash
agentskit-chat init my-chat --renderer react --yes
agentskit-chat init my-mobile --renderer react-native --yes
agentskit-chat init my-cli --renderer ink --yes
agentskit-chat init my-vue --renderer vue --yes
```

## `add component`

```bash
agentskit-chat add component <name> --renderer react,vue[,ink...] [--directory .] [--yes]
```

| Flag | Description |
| --- | --- |
| `<name>` | Portable id (starts with a letter) |
| `--renderer` | Comma-separated targets |
| `--directory` | Project root (default `.`) |
| `--yes` | Non-interactive |

Writes `src/components/<name>.ts` (schema + fallback) and presentation files per renderer.
Checks destinations first, rejects symlink traps, rolls back on failure.

```bash
agentskit-chat add component status-card --renderer react,vue,ink --directory . --yes
```

Register the export in your component manifest and wire the renderer `standardComponent` slot.

## `completion`

```bash
agentskit-chat completion bash
agentskit-chat completion zsh
agentskit-chat completion fish
```

Prints a completion script to stdout — source it from your shell config.

## Errors

| Code / message | Fix |
| --- | --- |
| `RENDERER_REQUIRED` | Pass a supported `--renderer` |
| `TARGET_EXISTS` | Choose a new directory name |
| `MANIFEST_INVALID` | Fix host `package.json` or pass flags explicitly |
| `COMPONENT_INVALID` | Rename the component |
| `COMPONENT_EXISTS` | Rename or remove the collision yourself |

## Next

- [Install and run](/docs/guides/install-and-run)
- [Components](/docs/components/catalog)
