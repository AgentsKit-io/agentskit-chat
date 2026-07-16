# v0.4 compatibility matrix

The two public AgentsKit Chat packages ship as the fixed `0.4.1` group. The peer ranges in
the published manifests are authoritative; this table summarizes the supported
minimums and release evidence.

| Renderer | AgentsKit binding | Host framework | Evidence |
|---|---|---|---|
| React | `@agentskit/react ^0.7.1` | React 18+ | component tests, Chromium E2E, conformance |
| React Native | `@agentskit/react-native ^0.4.4` | React 18+, React Native | component/accessibility tests, Expo web/iOS bundle, conformance |
| Ink | `@agentskit/ink ^0.10.1` | Ink 7.1+, React 18+ | component tests, real PTY interactions, conformance |
| Vue | `@agentskit/vue ^0.4.4` | Vue 3.4+ | component tests, build, conformance |
| Svelte | `@agentskit/svelte ^0.4.4` | Svelte 5+ | component tests, SSR test, package build, conformance |
| Solid | `@agentskit/solid ^0.4.4` | Solid 1.9+ | component tests, build, conformance |
| Angular | `@agentskit/angular ^0.4.6` | Angular 18.1–21, RxJS 7 | component tests, partial-Ivy AOT package test, conformance |

Core packages require the published AgentsKit ranges in their manifests:
`@agentskit/core` 1.12.x, `@agentskit/memory` 0.11.x,
`@agentskit/statechart` 0.2.x, and `@agentskit/eval` 0.4.19+ where used.
The release workflow builds on Node 24 with npm 11 and also runs the normal CI
matrix on Node 22.

The [generated conformance matrix](../conformance/matrix.generated.md) is the
release-blocking component/event/platform record. A range being installable is
not enough: a new upstream version is promoted only after the repository gates
pass against it.
