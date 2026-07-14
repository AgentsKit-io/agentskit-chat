# Replayable application traces

Use the upstream recorder for model traffic and the Chat capture for application decisions:

```ts
import { createRecordingAdapter, createReplayAdapter } from '@agentskit/eval/replay'
import { captureActionPolicyTrace, captureActionTrace, captureTurnTrace, createReplayFixture, createTraceCapture, serializeReplayFixture } from '@agentskit/chat/devtools'

const recording = createRecordingAdapter(adapter)
const capture = createTraceCapture({ redactFields: ['token', 'password', 'authorization'] })

// Wire these into conversation.onTrace and capability-policy onTrace.
const onTurnTrace = (trace) => captureTurnTrace(capture, trace)
const onPolicyTrace = (trace) => captureActionPolicyTrace(capture, trace)
const onActionChange = (confirmation) => captureActionTrace(capture, confirmation)

const route = capture.append({ category: 'route', detail: { routeId: 'support', fromState: 'idle', toState: 'open' } })
capture.append({ category: 'policy', parentId: route.id, detail: { action: 'open-ticket', decision: 'allow' } })

const committedJson = serializeReplayFixture(createReplayFixture(recording.cassette, capture.snapshot()))
const offlineAdapter = createReplayAdapter(recording.cassette)
```

Store `committedJson` as a normal JSON fixture. `parseReplayFixture` validates the application envelope, causal order, and upstream cassette version before replay.

## Privacy

Configured redaction matches object field names case-insensitively at every nested depth and replaces values with `[REDACTED]`. It applies only to application trace details. Upstream cassettes contain adapter requests and streamed chunks, which may include prompts, tool arguments, or model output; sanitize or protect them according to your own retention policy before committing.

## Trace schema and limits

| Field | Contract |
|---|---|
| `id` / `parentId` | Portable identifiers; a parent must precede its child |
| `sequence` | Contiguous, zero-based causal order |
| `at` | ISO-8601 timestamp |
| `category` | `route`, `agent`, `repair`, `fallback`, `policy`, `action`, or `lifecycle` |
| `detail` | JSON object, maximum 64 KiB UTF-8 |

A fixture contains at most 10,000 traces and `parseReplayFixture` refuses JSON larger than 16 MiB before parsing.

## Renderer parity

`compareRendererOutcomes` takes at least two renderer results. Each result identifies semantic outcomes by the composite `turnId` and `kind`, so one turn may contain text, component, and action outcomes. The first renderer is the baseline; missing or different outcomes become stable mismatch entries. Object-key order is ignored. Visual layout is intentionally outside this contract.
