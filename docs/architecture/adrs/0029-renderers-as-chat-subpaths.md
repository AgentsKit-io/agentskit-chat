# ADR-0029 — Renderers as Chat subpaths

- **Status:** Accepted
- **Date:** 2026-07-14
- **Supersedes:** The renderer-publication decision in ADR-0028

## Context

ADR-0028 kept seven framework renderers as standalone npm products because they
have distinct peer dependencies and build formats. Those boundaries remain
useful inside the monorepo, but npm optional peer dependencies and explicit
subpath exports allow one public tarball without loading unrelated frameworks.
Maintaining seven release identities creates substantially more operational work
than the renderer compatibility boundaries require.

## Decision

The React, React Native, Ink, Vue, Svelte, Solid, and Angular workspace packages
become private implementation modules. Their native build artifacts are assembled
into `@agentskit/chat` and exported respectively from `/react`, `/react-native`,
`/ink`, `/vue`, `/svelte`, `/solid`, and `/angular`.

Framework runtimes remain optional peers of `@agentskit/chat`. Importing the root
or another renderer subpath does not load an unrelated framework. The CLI remains
the only separate public Chat package because it owns an executable binary.

Legacy renderer package names remain published and supported until a separate
deprecation and removal phase is approved.

## Consequences

- The future Chat npm surface drops from nine packages to two.
- Renderer source ownership, native compilation, tests, and bundle budgets stay
  isolated in their existing workspace packages.
- Consumers install one Chat package and select a renderer through a subpath.
- Release verification must prove every exported artifact exists in the combined
  tarball and exercise a clean-room renderer build.
