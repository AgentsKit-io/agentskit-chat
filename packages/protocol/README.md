# @agentskit/chat-protocol

Framework-neutral v1 turn events for AgentsKit Chat.

```ts
import { decodeTurnEvent } from '@agentskit/chat-protocol'

const result = decodeTurnEvent(untrustedInput)
if (!result.ok) return result.diagnostic
```

The package transports snapshots of canonical AgentsKit state. It does not implement a controller, stream reducer, transport, or persistence layer.

It also owns the accepted versioned site-config, local-knowledge, and unified-answer envelopes used by the deterministic answer plane. Decode untrusted data with `decodeDeterministicSiteConfig` and `decodeAnswerResponse`; cryptographically verify local artifacts with `verifyLocalKnowledgeArtifact`. See the [deterministic answer guide](../../docs/protocol/deterministic-answers.md).

The package also validates the additive Ask request, trusted backend site
configuration, grounded sources, CAS session records, typed diagnostics,
usage, and privacy-safe metrics used by `createAskServiceHandler`. See the
[backend guide](../../docs/backend.md).

For one canonical assistant message containing both streamed prose and registered application components, use `createAssistantContentEncoder` and decode with `decodeAssistantContent`. Every text chunk must pass through the encoder; raw model output must never be appended to the envelope. See the [v1 protocol guide](../../docs/protocol/v1.md#ordered-assistant-content).
