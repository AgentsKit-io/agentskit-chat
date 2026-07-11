# Action policy

Compose trusted capability policy into the same `ChatConfig` used by every renderer:

```ts
const policy = createCapabilityPolicy({
  sessionId,
  getContext: () => authenticatedSession,
  requirements: {
    'email.send': ['email:send'],
    'docs.open': [],
  },
  onTrace: trace => auditBuffer.push(trace),
})

const chat = withActionPolicy(baseChat, policy)
```

`getContext` is a trusted host seam. Never populate it from prompts, messages, component props, or tool arguments. Unknown actions and missing context are denied before confirmation. Capabilities are checked again immediately before execution, so revocation remains effective after a user has seen a confirmation.

Policy traces are immutable and replayable but are not a durable audit ledger. Persist them in the host if compliance or incident investigation requires retention.

