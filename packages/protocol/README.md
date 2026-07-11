# @agentskit/chat-protocol

Framework-neutral v1 turn events for AgentsKit Chat.

```ts
import { decodeTurnEvent } from '@agentskit/chat-protocol'

const result = decodeTurnEvent(untrustedInput)
if (!result.ok) return result.diagnostic
```

The package transports snapshots of canonical AgentsKit state. It does not implement a controller, stream reducer, transport, or persistence layer.
