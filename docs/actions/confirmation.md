# Typed action confirmation

An actionable choice moves through `pending → approved`, `pending → rejected`, or `pending → expired`. These are safe application lifecycle records around the canonical AgentsKit tool call.

| Field | Meaning |
|---|---|
| `token` | Opaque session correlation handle; not authentication |
| `sessionId` | Session allowed to approve or reject |
| `action` | Registered upstream tool name |
| `input` | Validated, immutable argument snapshot |
| `toolCallId` | Canonical AgentsKit tool-call identity |
| `expiresAt` | Absolute expiry checked before approval |
| `status` | `pending`, `approved`, `rejected`, or `expired` |

Approval is claimed before delegation, so concurrent replay cannot execute twice. Reject and expiry delegate to upstream denial. A token from another session is inert.

This slice does not claim to be an audit ledger. Policy work may observe these fields and the upstream tool lifecycle, attach approver identity, and persist audit events without changing the execution path.
