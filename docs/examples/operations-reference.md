# Policy-protected operations reference

Open React or React Native with `?reference=operations`, or run Ink with `AK_EXAMPLE=operations`. Type `/operations` to read `checkout-api` status or propose a restart. Both actions use separate trusted capabilities and explicit operator confirmation; restart additionally uses a trusted-session + call-ID idempotency key because it mutates state.

## Threat model

| Threat | Guard |
|---|---|
| Prompt/component forges capability | capabilities come only from the injected host context |
| Read permission implies mutation | `operations.read` and `operations.restart` are independent policy requirements |
| Malformed/extra arguments | strict JSON Schema plus upstream AJV validation |
| Stale, duplicate, rejected, or cross-session approval | session-bound, expiring, idempotent `createActionConfirmation` record |
| Secret leaks through audit | trace capture records IDs/decisions/result metadata and redacts configured field names |

Each factory result binds one trusted context, service, policy, session, and trace capture. Do not share it across authenticated sessions.

## Audit/replay example

```json
[
  { "category": "policy", "detail": { "action": "restart-operation", "phase": "propose", "decision": "allow" } },
  { "category": "action", "detail": { "action": "restart-operation", "toolCallId": "app-1", "status": "pending" } },
  { "category": "action", "detail": { "action": "restart-operation", "toolCallId": "app-1", "status": "approving" } },
  { "category": "policy", "detail": { "action": "restart-operation", "phase": "execute", "decision": "allow" } },
  { "category": "action", "detail": { "action": "restart-operation", "phase": "confirmed-execution", "toolCallId": "app-1", "operationId": "checkout-api" } },
  { "category": "lifecycle", "detail": { "action": "restart-operation", "phase": "result", "toolCallId": "app-1", "status": "healthy", "revision": 2 } },
  { "category": "action", "detail": { "action": "restart-operation", "toolCallId": "app-1", "status": "approved" } }
]
```

The example uses `@agentskit/chat/devtools` trace capture; it does not implement another ledger. Production hosts should append snapshots to a durable, access-controlled audit sink, preserve canonical tool-call correlation IDs, apply retention policy, and never store credentials or raw service errors.

## Upstream adoption

Inspected AgentsKit revision `4d66eb192d636b53d0c7bec39894250dc71cde5f`: `packages/core/src/chat.ts`, `packages/core/src/tool-proposal-internal.ts`, `packages/core/src/tool-authorization-internal.ts`, and the confirmation components exported by `packages/react`, `packages/react-native`, and `packages/ink`. Published contracts from `@agentskit/core@1.12.2` are consumed directly. AgentsKit Chat adds only capability composition, application choices, and safe application traces. No upstream source or behavior is copied.
