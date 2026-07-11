# ADR-0014: Safe application scaffolding in a dedicated CLI

**Status:** Accepted
**Date:** 2026-07-11

## Context

AgentsKit already scaffolds general AgentsKit starters and extension packages. AgentsKit Chat needs complete application slices containing its shared definition, server boundary, renderer, tests, and guidance without copying upstream templates or overwriting host projects.

## Decision

`@agentskit/chat-cli` owns the `agentskit-chat init` application command. It uses Node standard-library parsing, prompting, and filesystem APIs; detects React, Expo/React Native, or Ink from package dependencies; prompts only on an interactive TTY; and atomically promotes a staged project only when the target path does not exist.

Templates import published AgentsKit and AgentsKit Chat packages. They add only application composition. No upstream controller, adapter, renderer primitive, or general AgentsKit scaffold is reproduced.

## Consequences

- CI has a fully flag-driven command and JSON success output.
- Initialization is idempotent by refusal rather than risky file merging.
- Templates are tested by installing, type-checking, and running their tests as real workspace fixtures.
- Future renderers extend the closed renderer enum and conformance matrix.

## Upstream adoption

Inspected AgentsKit revision `main` on 2026-07-11: `@agentskit/cli@0.13.10` exports `writeStarterProject` via `packages/cli/src/index.ts` and implements it in `packages/cli/src/init.ts` (command adapter: `packages/cli/src/commands/init.ts`); `@agentskit/templates@0.4.3` exports `scaffold` via `packages/templates/src/index.ts` and implements it in `packages/templates/src/scaffold.ts`. Those APIs own general starters and extension packages and do not express a safe AgentsKit Chat application slice. Generated code composes only their underlying published AgentsKit contracts; no upstream source is copied.
