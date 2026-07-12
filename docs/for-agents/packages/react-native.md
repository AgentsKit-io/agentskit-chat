# React Native renderer

- Owns only the native application shell, specialized `ChoiceListNative`, and generic `StandardComponentNative` presentation in `packages/react-native`.
- Resolve shared frames against the framework-neutral manifest before rendering; emit only shared selection events.
- Delegate controller state and UI primitives to `@agentskit/react-native`.
- Keep React Native as a peer dependency; native modules belong to the Expo app.
- Never add DOM assumptions or reproduce AgentsKit lifecycle behavior.
- Native retry, edit, regenerate, and stop controls call `ChatReturn` directly; AgentsKit owns mutation and abort semantics.
- Render typed actions with the published upstream `ToolConfirmation`; do not add a native confirmation duplicate.
- Map semantic themes through upstream `style` pass-throughs and native application styles. Slots remain React Native components; fully headless state uses upstream `useChat` directly.
- Validate with lint, unit tests, Expo example build, E2E, and doc-bridge gates.
