# @agentskit/chat-cli

```bash
agentskit-chat init my-chat --renderer react --yes
```

Supported targets are `react`, `react-native`, `ink`, `vue`, `svelte`, `solid`,
and `angular`. The command detects a host package manifest when unambiguous,
prompts only on an interactive TTY, and atomically publishes only to a target
path that does not already exist.

Generated projects contain a shared definition, Web-standard server handler, native renderer, test, and architecture README. They use only published AgentsKit and AgentsKit Chat packages.
