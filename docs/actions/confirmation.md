# Typed action confirmation

Without persistent storage, an actionable choice moves from `pending` directly to `approved`, `rejected`, or `expired` after upstream success. Persistent cross-client sessions first claim `approving`, `rejecting`, or `expiring` through storage CAS, delegate only from the winning client, then persist the matching terminal status.

| Field | Meaning |
|---|---|
| `token` | Opaque session correlation handle; not authentication |
| `sessionId` | Session allowed to approve or reject |
| `action` | Registered upstream tool name |
| `input` | Validated, immutable argument snapshot |
| `toolCallId` | Canonical AgentsKit tool-call identity |
| `expiresAt` | Absolute expiry checked before approval |
| `status` | `pending`; processing `approving`, `rejecting`, `expiring`; or terminal `approved`, `rejected`, `expired` |

Persistent resolution is claimed before delegation, so concurrent replay cannot execute twice. A failure or crash after the claim leaves an accurate processing record for host reconciliation; processing and terminal records are inert on resume. In-memory resolution preserves retryable behavior by marking the outcome only after upstream success. A token from another session is inert.

This slice does not claim to be an audit ledger. Policy work may observe these fields and the upstream tool lifecycle, attach approver identity, and persist audit events without changing the execution path.
