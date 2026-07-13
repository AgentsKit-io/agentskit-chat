# Ask service integration

`@agentskit/chat` exposes the shared client boundary used by AgentsKit Docs, Registry, and Playbook:

```ts
import { createAskAdapter, createAskSessionMemory, defineChat } from '@agentskit/chat'

const definition = defineChat({
  id: 'registry-ask',
  chat: {
    adapter: createAskAdapter({
      endpoint: 'https://ask.agentskit.io/v1/ask',
      corpus: 'registry',
      persona: 'registry-guide',
    }),
    memory: createAskSessionMemory({
      key: 'agentskit:registry:ask:v2',
      legacyKeys: ['agentskit:registry:ask'],
    }),
  },
})
```

`@agentskit/chat-protocol` owns the v1 Ask event schema, bounds, and NDJSON decoder. The adapter consumes that runtime boundary, converts text and citations into one ordered canonical assistant-message string, and delegates message/controller behavior to AgentsKit. `answer` becomes text and `cite` becomes the standard `source-list` component. Unknown and malformed events are inert. The adapter recognizes valid Ask records even when an intermediary serves NDJSON as `text/plain`; a body that is not valid Ask NDJSON remains safely encoded as text records.

The additive backend request is `agentskit.chat.ask` v1. It carries bounded
projected messages, the application session ID when available, and only a
validated low-confidence deterministic escalation. It never carries trusted
site, corpus, assistant, component, action, tenant, or subject authority. The
server resolves those fields from authenticated context using the
`agentskit.chat.backend-site` v1 schema.

Transport chunk boundaries do not affect decoding: limits apply to individual Ask records, the retained partial line, and a fixed per-decode record budget. An oversized partial line is discarded through its next newline so its suffix cannot become a separate event. The resulting assistant message also enforces the ordered-content byte and record limits before emitting a chunk, so a long service response cannot create canonical content that its renderers or memory reject.

`endpoint`, `corpus`, and `persona` are the transport configuration seam. Relative endpoints remain relative for same-origin proxies. The 30-second deadline covers connection establishment only; after headers arrive, the stream continues until completion or the host calls the upstream stop/abort lifecycle.

Host-only application tools may be projected into a validated `ComponentRenderFrame`:

```ts
createAskAdapter({
  corpus: 'docs',
  projectTool(event) {
    if (event.name !== 'codeBlock') return undefined
    return docsCodeBlockFrame(event)
  },
})
```

The callback cannot bypass component-frame runtime validation. It is presentation policy, not another protocol decoder.

`createAskSessionMemory` composes the released `@agentskit/memory/web-storage` implementation. Use a new canonical key and list old host keys under `legacyKeys`; canonical records are runtime validated and bounded, and valid legacy data remains readable when Web Storage is full or read-only. The built-in migration accepts the historical `{ role, text }`, `{ role, content }`, and Docs `{ role: 'assistant', parts }` formats.

See [ADR-0022](../architecture/adrs/0022-shared-ask-service-integration.md).
The trusted server vertical, diagnostics, persistence, and privacy-safe metric
contracts are specified by [ADR-0026](../architecture/adrs/0026-trusted-ask-backend-vertical.md)
and the [backend guide](../backend.md).
