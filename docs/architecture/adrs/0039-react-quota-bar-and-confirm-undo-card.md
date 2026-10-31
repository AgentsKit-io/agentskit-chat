# ADR-0039: React quota bar and confirm/undo card

Status: Proposed, 2026-10-31.

## Context

Products receive `quota` (`utilization`, `warning`) in turn snapshots and tool calls with `status: 'requires_confirmation'`, and each writes its own UI. `@agentskit/react` already ships `ToolConfirmation`, which renders approve/deny controls for a `ToolCall` but has no label props and no undo.

## Decision

`@agentskit/chat-react` exports three additions. Both components are native-element, unstyled-by-default and read only existing `--ak-*` tokens (`--ak-color-*`, `--ak-radius`, `--ak-spacing-md`, `--ak-font-family`, `--ak-app-color-danger`). No theme key is added.

### `QuotaBar`, `QuotaBarProps`, `QuotaBarLabels`, `QuotaState`, `resolveQuotaState`

- Props: `quota?: { utilization, warning }` (snapshot) or `used` + `limit` (a `CostStore` window); `warnAt` (default 0.8, used only without `quota.warning`); `blockAt` (default 1); `labels`; `className`. With no usable data it renders nothing.
- Labels (all optional, English defaults): `title`, `ok`, `warning`, `blocked`, `valueText(percent)`.
- `resolveQuotaState(utilization, warning, blockAt?)` returns `'ok' | 'warning' | 'blocked'`; blocked wins at or above `blockAt`.
- DOM: `role="progressbar"` (`aria-valuenow` clamped 0-100, `aria-valuetext`), a status line with `role="status"` when ok and `role="alert"` when warning or blocked. Attribute: `data-ak-quota-state="ok|warning|blocked"`. Colors: ok `--ak-color-button`, warning `--ak-color-text`, blocked `--ak-app-color-danger`; the state is also conveyed by text, never by color alone.

### `ConfirmUndoCard`, `ConfirmUndoCardProps`, `ConfirmUndoCardLabels`, `ConfirmUndoPhase`, `ConfirmUndoToolCall`, `resolveConfirmPhase`

- Props: `toolCall` (upstream `ToolCall`), `onApprove(toolCallId)`, `onDeny(toolCallId, reason?)`, optional `onUndo(toolCallId)`, `description`, `labels` (`title`, `approved`, `denied`, `undo`), `className`. Signatures match `AgentChatSlots.Confirmation`.
- The pending controls are upstream `ToolConfirmation`. The phase is derived from `toolCall.status` only (`requires_confirmation` → pending; `error` with `Permission denied` prefix, the upstream deny record → denied; any other status → approved). The card holds no optimistic state.
- DOM: `role="group"`, `data-ak-confirm-phase="pending|approved|denied"`, a `role="status"` region with `tabIndex=-1`. Upstream attributes (`data-ak-tool-confirmation*`) are unchanged. Undo is a native button, shown only when approved and `onUndo` is set.
- Focus: when the phase leaves pending, focus moves to the status region; when it returns to pending, to Approve; clicking Undo keeps focus on the status region.

## Upstream adoption

Inspected `@agentskit/react` 0.8.10 `ToolConfirmation` and `@agentskit/core` `ToolCall`/`ToolCallStatus` and `controller.deny`; and the protocol `TurnQuotaSchema`. Reused: `ToolConfirmation`, `ToolCall`. Local: quota state resolution, the status-derived phase, the status/undo region and focus handling. Upstream lacks approve/deny label props and an undo affordance; the approve/deny button text stays English until upstream adds labels (upstream issue: AgentsKit-io/agentskit#1933).

## Consequences

- Additive public exports; no contract is broken.
- Undo is a host callback: the card cannot reverse a tool run, the host must act and update the tool call.
- Warning has no dedicated color; adding one is a theme change for a later RFC.
