# Streaming lifecycle

AgentsKit owns the lifecycle. AgentsKit Chat renderers expose the same `ChatReturn` operations without wrapping their semantics:

| Operation | AgentsKit method | Default renderer interaction |
|---|---|---|
| Cancel | `stop()` | Stop button; Escape in Ink |
| Retry | `retry()` | Retry response; `/retry` in Ink |
| Edit | `edit(messageId, content)` | Edit last message; `/edit <content>` in Ink |
| Regenerate | `regenerate(messageId?)` | Regenerate response; `/regenerate` in Ink |

Cancellation aborts the upstream source. AgentsKit prevents chunks arriving after the abort from mutating canonical state. The framework does not implement another abort flag or stream reducer.

## Lineage and reconnect

A v1 `server.turn.snapshot` may include:

```json
{
  "lineage": {
    "operation": "regenerate",
    "parentTurnId": "turn-previous",
    "sourceMessageId": "message-assistant"
  }
}
```

Use `createSnapshotEvent(...)` to project canonical AgentsKit messages plus submit/retry/edit/regenerate lineage. Use `createTurnSnapshotCursor(sessionId)` when applying snapshots received from a transport. The expected session is fixed before the first delivery; its first valid snapshot initializes reconnect state. Later snapshots must have a greater sequence. Duplicate, stale, malformed, and foreign-session events do nothing.

Snapshots remain complete projections. The cursor chooses the current projection; it never merges messages or interprets adapter chunks.
