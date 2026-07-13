# ADR-0026: Trusted Ask backend vertical

**Status:** Accepted

**Date:** 2026-07-13

## Context

The deterministic answer plane resolves exact site facts without a network call, but semantic questions need a shared backend. Registry, Playbook, and Docs must be able to use that backend without allowing a browser to select another tenant, assistant, corpus, component, or action. Hosted and self-hosted operators also need the same public wire contract and enough privacy-safe measurements to establish a baseline before optimization.

AgentsKit already owns adapters, provider execution, RAG retrieval, canonical chat memory, controller lifecycle, token usage, and cancellation. AgentsKit Chat must compose those capabilities rather than implement alternatives.

## Decision

`@agentskit/chat-server` exposes `createAskServiceHandler`, a Web-standard `Request` to `Response` handler. Authentication and validated site resolution happen before body parsing. The authenticated server context selects the complete site configuration: site and assistant identity, corpus and retrieval mode, suggestions, registered components/actions, deadlines, source limit, and persistence policy. Client `corpus` and `persona` query parameters are compatibility hints only; a mismatch fails closed.

The client sends the additive `agentskit.chat.ask` v1 request through `createAskAdapter`. A resumed application session contributes its validated session ID. When the deterministic plane escalates, its low-confidence envelope is included as bounded context so the server can measure fallback without receiving local artifacts or allowing it to grant authority.

Hosts inject local or federated retrieval through an upstream AgentsKit RAG/Retriever adapter, generation through an AgentsKit provider/adapter, a CAS session store when persistence is required, rate limiting, authentication, and a metric observer. The server passes only the trusted corpus configuration to retrieval. Successful answers require at least one runtime-validated safe citation and stream through the existing Ask NDJSON events. It does not accept generated actions or components; the only server-projected component in this vertical is the standard citation list.

Persistence loads a trusted `(site, subject, session)` record and appends only the latest submitted user turn to canonical stored history. Save uses an expected revision and reports a typed conflict. Histories, sources, answers, requests, and streams are bounded. Request, retrieval, generation, response cancellation, and persistence share abortable deadlines.

Metrics contain only site/corpus/request identifiers, a fixed metric name, numeric value/unit/outcome, and time. They cover first event/token, total latency, bytes, Ask events, snapshot count, deterministic fallback, retrieval, persistence, cancellation, conflicts, errors, tokens, and cost. Prompts, answers, sources, credentials, subject/session IDs, and provider errors are never fields. Ask emits no snapshot events, so `stream.snapshots` is truthfully recorded as zero; the existing snapshot handler retains its separate turn protocol.

No snapshot/delta or persistence-frequency optimization is part of this decision. Any such change needs baseline evidence and explicit HITL approval.

## Alternatives considered

1. Trust browser corpus/persona parameters — rejected because they are an authorization bypass.
2. Bundle a vector store, model provider, authentication, rate limiter, or database — rejected because these are upstream or host responsibilities.
3. Return uncited model output when retrieval is empty — rejected because it would misrepresent semantic recommendations as grounded.
4. Create a second streaming protocol — rejected because the published Ask NDJSON protocol and source-list projection already serve every renderer.
5. Put prompts or answers in telemetry — rejected because aggregate performance and cost baselines do not require user content.

## Consequences

- Hosted and self-hosted deployments mount the same handler and use the same request, event, site-config, diagnostic, and metric schemas.
- Operators must provide durable CAS storage when a site declares required persistence.
- Retrieval and generation providers remain replaceable and keep their own provider-specific resilience.
- A deterministic miss can be measured end-to-end without weakening corpus isolation.
- Empty or invalid source sets fail safely instead of producing an uncited answer.

## Upstream adoption

Inspected published AgentsKit Core adapter/controller/cancellation/usage contracts, AgentsKit RAG `createRAG`, `RAG`, `Retriever`, and `RetrievedDocument`, and the existing AgentsKit Chat `createAskAdapter`, session-aware adapter seam, deterministic escalation envelope, Web server handler, session CAS, Ask events, and SourceList projection. The implementation reuses those boundaries and adds only site-owned policy validation, trusted host composition, bounded cited projection, CAS coordination, and privacy-safe observations. It copies no controller, adapter lifecycle, retrieval, ranking, embeddings, storage engine, provider transport, memory engine, or renderer behavior.
