# CLI

```bash
agentskit-chat init my-chat --renderer react --yes
agentskit-chat init my-mobile-chat --renderer react-native --yes
agentskit-chat init my-terminal-chat --renderer ink --yes
agentskit-chat init my-vue-chat --renderer vue --yes
agentskit-chat init my-svelte-chat --renderer svelte --yes
agentskit-chat init my-solid-chat --renderer solid --yes
agentskit-chat init my-angular-chat --renderer angular --yes
agentskit-chat add component status-card --renderer react,vue,ink --directory . --yes
```

Without `--renderer`, the command detects React, Vue, Svelte, Solid, Angular, React Native, or Ink dependencies from the current host project while writing to the requested empty child directory. Native-specific dependencies win over React when both are present. If detection is impossible, an interactive TTY asks once; non-interactive execution fails with an actionable flag.

Every starter contains a shared `src/chat.ts`, Web-standard `src/server.ts`, native renderer entry, strict TypeScript configuration, test, and README. The target path must not exist: the CLI never merges, deletes, or overwrites project files.

Generate native shell completion with `agentskit-chat completion bash`, `zsh`, or `fish`.

`add component` creates `src/components/<name>.ts` as the single strict schema, semantic identity, metadata, and fallback. It creates presentation files only for the comma-separated renderer targets. Register the exported definition in your component manifest and connect native files through the renderer's `standardComponent` slot. React, React Native, Ink, Vue, and Solid exports already match their slot callback props. Svelte and Angular files accept the slot's `frame` through a snippet or `#standardComponent` template wrapper. The command checks every destination first, rejects symbolic-link directories, and rolls back files created by a failed operation.

## Troubleshooting

- `RENDERER_REQUIRED`: add one of the seven supported `--renderer` values.
- `TARGET_EXISTS`: choose a new target path that does not exist.
- `MANIFEST_INVALID`: repair `package.json` or use an explicit renderer and a new target path.
- `COMPONENT_INVALID`: use a portable name beginning with a letter.
- `COMPONENT_EXISTS`: rename the component or remove the collision yourself; the CLI never overwrites it.

