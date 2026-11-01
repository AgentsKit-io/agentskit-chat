# React boundary: `@agentskit/chat/react` and `@agentskit/react` (RF-05)

`@agentskit/chat/react` consumes `@agentskit/react`; it never copies it. A component or
hook exists in exactly one of the two packages.

## What each package owns

| Concern | Owner |
|---|---|
| `useChat`, streaming, cancellation, retry/edit/regenerate, memory, adapters | `@agentskit/react` (via `@agentskit/core`) |
| `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, `ToolConfirmation`, theme CSS and `data-ak-*` hooks | `@agentskit/react` |
| `AgentChat` shell wiring a `ChatDefinition` to the upstream hook and components | `@agentskit/chat/react` |
| `ChoiceList`, `StandardComponent` (validated application component frames) | `@agentskit/chat/react` |
| `QuotaBar`, `ConfirmUndoCard` (the latter composes upstream `ToolConfirmation`) | `@agentskit/chat/react` |
| Semantic theme to `--ak-*` mapping (`toChatCssVariables`) | `@agentskit/chat/react` |

## Rules

- The package imports upstream components and `useChat` and renders them; it does not
  define a component or hook with an upstream name, and it does not re-export upstream ones.
  Products import those from `@agentskit/react` directly. A test in `packages/react/tests`
  enforces this.
- A missing upstream seam or defect is fixed in `AgentsKit-io/agentskit` first
  ([ADR-0002](./adrs/0002-upstream-first-no-reimplementation.md)).
- `@agentskit/react` is an optional peer of `@agentskit/chat`, so products pick the version.

## Published packages used by products

Products install `@agentskit/chat` (subpaths `/react`, `/server`, `/protocol`, `/drizzle-pg`) and
`@agentskit/chat-cli`. The workspace packages `react`, `server` and `protocol` are private
implementation modules assembled into `@agentskit/chat`
([ADR-0028](./adrs/0028-public-package-consolidation.md),
[ADR-0029](./adrs/0029-renderers-as-chat-subpaths.md)). Versions and notes are in the root
[CHANGELOG](../../CHANGELOG.md).
