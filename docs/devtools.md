# Replayable application traces

Use the upstream recorder for model traffic and the Chat capture for application decisions:

```ts
import { createRecordingAdapter, createReplayAdapter } from '@agentskit/eval/replay'
import { captureActionPolicyTrace, captureTurnTrace, createReplayFixture, createTraceCapture, serializeReplayFixture } from '@agentskit/chat-devtools'

const recording = createRecordingAdapter(adapter)
const capture = createTraceCapture({ redactFields: ['token', 'password', 'authorization'] })

// Wire these into conversation.onTrace and capability-policy onTrace.
const onTurnTrace = (trace) => captureTurnTrace(capture, trace)
const onPolicyTrace = (trace) => captureActionPolicyTrace(capture, trace)

const route = capture.append({ category: 'route', detail: { routeId: 'support', fromState: 'idle', toState: 'open' } })
capture.append({ category: 'policy', parentId: route.id, detail: { action: 'open-ticket', decision: 'allow' } })

const committedJson = serializeReplayFixture(createReplayFixture(recording.cassette, capture.snapshot()))
const offlineAdapter = createReplayAdapter(recording.cassette)
```

Store `committedJson` as a normal JSON fixture. `parseReplayFixture` validates the application envelope, causal order, and upstream cassette version before replay.

## Privacy

Configured redaction matches object field names at every nested depth and replaces values with `[REDACTED]`. It applies only to application trace details. Upstream cassettes contain adapter requests and streamed chunks, which may include prompts, tool arguments, or model output; sanitize or protect them according to your own retention policy before committing.

## Renderer parity

`compareRendererOutcomes` takes at least two renderer results. Each result identifies semantic outcomes by `turnId` and `kind`. The first renderer is the baseline; missing or different outcomes become stable mismatch entries. Object-key order is ignored. Visual layout is intentionally outside this contract.
