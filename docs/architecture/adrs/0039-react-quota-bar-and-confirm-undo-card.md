# ADR-0039: React quota bar and confirm/undo card

Status: Proposed, 2026-10-31.

## Context

Products receive `quota` (`utilization`, `warning`) in turn snapshots and tool calls with `status: 'requires_confirmation'`, and each writes its own UI. `@agentskit/react` already ships `ToolConfirmation`, which renders approve/deny controls for a `ToolCall` but has no label props and no undo.

## Decision

`@agentskit/chat-react` exports `QuotaBar` and `ConfirmUndoCard` (with their types and helpers). They are published through the `@agentskit/chat/react` subpath of `@agentskit/chat`, which bundles the React renderer. Both components are native-element, unstyled-by-default and read only existing `--ak-*` tokens (`--ak-color-*`, `--ak-radius`, `--ak-spacing-md`, `--ak-font-family`, `--ak-app-color-danger`). No theme key is added.

### `QuotaBar`, `QuotaBarProps`, `QuotaBarLabels`, `QuotaState`, `resolveQuotaState`

- Props: `quota?: { utilization, warning }` (snapshot) or `used` + `limit` (a `CostStore` window); `warnAt` (default 0.8, used only without `quota.warning`); `blockAt` (default 1); `labels` (required); `className`. With no usable data it renders nothing.
- Labels (all required, no English defaults): `title`, `ok`, `warning`, `blocked`, `valueText(percent)`.
- `resolveQuotaState(utilization, warning, blockAt?)` returns `'ok' | 'warning' | 'blocked'`; blocked wins at or above `blockAt`.
- DOM: `role="progressbar"` (`aria-valuenow` clamped 0-100, `aria-valuetext`), a status line with `role="status"` when ok and `role="alert"` when warning or blocked. Attribute: `data-ak-quota-state="ok|warning|blocked"`. Colors: ok `--ak-color-button`, warning `--ak-color-text`, blocked `--ak-app-color-danger`; the state is also conveyed by text, never by color alone.

### `ConfirmUndoCard`, `ConfirmUndoCardProps`, `ConfirmUndoCardLabels`, `ConfirmUndoPhase`, `ConfirmUndoToolCall`, `resolveConfirmPhase`

- Props: `toolCall` (upstream `ToolCall`), `onApprove(toolCallId)`, `onDeny(toolCallId, reason?)`, optional `onUndo(toolCallId)`, `description`, `labels` (required: `title`, `approve`, `deny`, `approved`, `denied`, `undo`), `className`. Signatures match `AgentChatSlots.Confirmation`.
- The pending controls are the card's own native approve/deny buttons, labeled by `labels.approve` and `labels.deny`; upstream `ToolConfirmation` is not used. The phase is derived from `toolCall.status` only (`requires_confirmation` → pending; `error` with `Permission denied` prefix, the upstream deny record → denied; any other status → approved). The card holds no optimistic state.
- DOM: `role="group"`, `data-ak-confirm-phase="pending|approved|denied"`, a `role="status"` region with `tabIndex=-1`. Undo is a native button, shown only when approved and `onUndo` is set.
- Focus: when the phase leaves pending, focus moves to the status region; when it returns to pending, to Approve; clicking Undo keeps focus on the status region.

## Upstream adoption

Inspected `@agentskit/react` 0.8.10 `ToolConfirmation` and `@agentskit/core` `ToolCall`/`ToolCallStatus` and `controller.deny`; and the protocol `TurnQuotaSchema`. Reused: the `ToolCall` type only. Local: quota state resolution, the status-derived phase, the status/undo region and focus handling. Upstream `ToolConfirmation` lacks label props and an undo affordance, so the card renders its own buttons and every text comes from the caller.

## Consequences

- Additive public exports; no contract is broken.
- Undo is a host callback: the card cannot reverse a tool run, the host must act and update the tool call.
- Warning has no dedicated color; adding one is a theme change for a later RFC.
