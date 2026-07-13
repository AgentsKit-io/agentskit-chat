# Cited RAG reference

Open React or React Native with `?reference=rag`, or run Ink with `AK_EXAMPLE=rag`. Ask a question to retrieve a grounded answer rendered through the portable `SourceList` component.

## Architecture

```text
question → AgentsKit RAG.retrieve → retrieved documents
         → provider-neutral answer formatter
         → validated SourceList frame → native renderer / text fallback
```

The application does not implement chunking, embeddings, vector search, thresholds, or reranking. Those remain in `@agentskit/rag`. The bundled deterministic embed/store are fixture adapters only; production hosts inject provider embeddings and a `VectorMemory` backend. The answer seam accepts a string, promise, or async iterable; the validated component frame is emitted through bounded stream chunks.

## Indexing and provider configuration

```ts
import { createRAG } from '@agentskit/rag'
import { createRagApplication } from '@agentskit/chat-example-shared'

const rag = createRAG({ embed: providerEmbed, store: vectorMemory, topK: 5, threshold: 0.7 })
await rag.ingest([{ id: 'guide', content: markdown, source: 'https://docs.example.dev/guide', metadata: { title: 'Guide', url: 'https://docs.example.dev/guide' } }])
export const definition = createRagApplication({ rag })
```

Keep embedding/vector credentials server-side. Apply deadlines and cancellation in provider/store adapters. Ingest canonical HTTPS or relative source URLs; documents with unsafe source schemes are dropped before protocol encoding. Bound titles, snippets, source counts, and answer text at the SourceList schema boundary.

Source clicks cross the protocol as validated source ids. Each trusted host resolves the id against the latest validated frame before using its native navigation API; unrecognized, stale, or URL-less sources are ignored.

## Empty and failure behavior

No retrieval result emits `No grounded sources were found` and never fabricates a citation. Invalid source metadata is dropped; if every source is unsafe, the response states that no safe grounded sources were found. Retrieval failures become an opaque upstream stream error without exposing provider internals.

## Upstream adoption

Inspected AgentsKit revisions `4d66eb192d636b53d0c7bec39894250dc71cde5f` and `edb77757d2f2ca095733392657cafd8b7dd59a78`, `@agentskit/rag@0.4.12`, and `packages/rag/src/index.ts`, `rag.ts`, `types.ts`, `chunker.ts`, and `loaders.ts`. The reference consumes `createRAG`, `RAG`, `RetrievedDocument`, and `VectorMemory` directly. Dogfooding found and fixed the optional S3 peer browser-bundle gap at the source through [AgentsKit #1180](https://github.com/AgentsKit-io/agentskit/issues/1180), [PR #1181](https://github.com/AgentsKit-io/agentskit/pull/1181), and release [PR #1182](https://github.com/AgentsKit-io/agentskit/pull/1182). AgentsKit Chat adds only validated SourceList presentation, safe interaction resolution, and native/fallback evidence; no retrieval primitive is copied.
