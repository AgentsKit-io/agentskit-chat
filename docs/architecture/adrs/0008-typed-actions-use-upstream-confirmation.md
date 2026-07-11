# ADR-0008: Typed actions use upstream confirmation

**Status:** Accepted

**Date:** 2026-07-11

## Context

A deterministic component choice may represent application intent with a side effect. AgentsKit already owns tool registration, runtime argument validation, canonical tool-call state, confirmation UI, approval, denial, and exactly-once execution. AgentsKit Chat must add session binding without creating a second executor or confirmation protocol.

## Decision

An actionable `ChoiceList` choice carries `{ name, input }`. The framework sends it to the released AgentsKit `ChatReturn.proposeToolCall` API. Only registered executable tools with `requiresConfirmation` can become pending calls; AgentsKit applies the configured `ArgsValidator` and snapshots arguments.

`createActionConfirmation` binds an opaque handle to session id, canonical tool-call id, registered action name, validated argument snapshot, and absolute expiry. Approval and rejection claim the local record before delegating exclusively to AgentsKit `approve` or `deny`. Replays return the terminal record. Expiry delegates denial and cannot execute.

React, React Native, and Ink render their official AgentsKit `ToolConfirmation` component. The framework adds no alternative confirmation widget.

The handle is a correlation and idempotency capability, not authentication. Authorization, approver identity, durable audit storage, and cryptographic bearer tokens belong to the policy/server slice.

## Consequences

- Tool execution and schema validation remain single-sourced in AgentsKit.
- All proof renderers share one framework-neutral lifecycle.
- In-memory confirmation records are session-scoped; durable recovery remains future server work.
- An approval is safety-biased: once claimed it is never automatically retried after an upstream failure.

## Upstream adoption

- Inspected: `@agentskit/core` tool/controller contracts and React, React Native, and Ink confirmation components.
- Reused: `ChatConfig.tools`, `ArgsValidator`, `ChatReturn.proposeToolCall`, `approve`, `deny`, `ToolCall`, and official `ToolConfirmation` components.
- Upstream work: [AgentsKit issue #1144](https://github.com/AgentsKit-io/agentskit/issues/1144), released by [PR #1145](https://github.com/AgentsKit-io/agentskit/pull/1145) in `@agentskit/core@1.11.0` and corresponding framework releases.
- Added locally: choice-to-action declaration and application-session metadata only.

