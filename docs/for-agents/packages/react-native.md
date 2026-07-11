# React Native renderer

- Owns only the native application shell in `packages/react-native`.
- Delegate controller state and UI primitives to `@agentskit/react-native`.
- Keep React Native as a peer dependency; native modules belong to the Expo app.
- Never add DOM assumptions or reproduce AgentsKit lifecycle behavior.
- Validate with lint, unit tests, Expo example build, E2E, and doc-bridge gates.
