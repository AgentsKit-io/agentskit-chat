# React Native renderer

- Owns only the native application shell and native `ChoiceList` presentation in `packages/react-native`.
- Resolve shared frames against the framework-neutral manifest before rendering; emit only shared selection events.
- Delegate controller state and UI primitives to `@agentskit/react-native`.
- Keep React Native as a peer dependency; native modules belong to the Expo app.
- Never add DOM assumptions or reproduce AgentsKit lifecycle behavior.
- Render typed actions with the published upstream `ToolConfirmation`; do not add a native confirmation duplicate.
- Validate with lint, unit tests, Expo example build, E2E, and doc-bridge gates.
