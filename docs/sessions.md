# Persistent cross-client sessions

AgentsKit remains the message authority. Configure one of its `ChatMemory` implementations on `definition.chat.memory`, then store only AgentsKit Chat application metadata through `SessionStorage`.

```ts
const session = await resumeChatSession(definition, {
  sessionId: 'customer-42',
  storage: applicationSessionStorage,
})

<AgentChat definition={definition} session={session} />
```

The same preparation works before mounting React Native or Ink. Each client loads the same session id from the host storage and points its `ChatConfig.memory` at the same canonical conversation.

`SessionStorage.save(snapshot, expectedCursor)` must be atomic: create only when `expectedCursor` is `undefined`, update only when the stored cursor equals it, and return `false` on conflict. This CAS claim prevents two resumed clients from resolving the same pending action. A plain last-write-wins key/value write is unsafe and does not implement the port.

Snapshots use `agentskit.chat.session` version 1. They contain definition identity/revision, deterministic application state, monotonic cursor, and pending or terminal confirmation bindings. They never contain messages. Increment `definition.revision` when a state-machine change makes old application metadata incompatible.

`resumeChatSession` starts clean when `load` returns `null` or `undefined`. Invalid JSON, unknown versions, session mismatch, definition mismatch, and revision mismatch reject before hydration. Version 0 is the only implicit migration currently supported.

Call `session.persist()` at an explicit durability boundary. Deterministic transitions also schedule saves. Confirmation changes await durable storage; a failure rejects the operation. Resolution moves through a durable processing status before delegation and reaches terminal status only after upstream success. A crash leaves processing state for host reconciliation, while restored processing/terminal confirmations remain inert.
