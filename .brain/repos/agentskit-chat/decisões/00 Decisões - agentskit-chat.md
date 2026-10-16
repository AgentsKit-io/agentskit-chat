---
tipo: guia
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "índice das decisões docs/architecture/adrs; doc-bridge CLI indisponível"
fontes: ["docs/architecture/adrs/0001-cross-framework-core.md", "docs/architecture/adrs/0002-upstream-first-no-reimplementation.md", "docs/architecture/adrs/0003-semantic-fallback-envelope.md", "docs/architecture/adrs/0004-snapshot-first-turn-protocol.md", "docs/architecture/adrs/0005-upstream-memory-record-validation.md", "docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md", "docs/architecture/adrs/0007-closed-application-component-manifest.md", "docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md", "docs/architecture/adrs/0009-trusted-capability-policy.md", "docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md", "docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md", "docs/architecture/adrs/0012-web-standard-snapshot-handler.md", "docs/architecture/adrs/0013-semantic-theme-native-slots.md", "docs/architecture/adrs/0014-safe-cli-scaffolding.md", "docs/architecture/adrs/0015-standard-component-catalog.md", "docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md", "docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md", "docs/architecture/adrs/0018-deterministic-route-identity-context.md", "docs/architecture/adrs/0019-session-confirmation-observers.md", "docs/architecture/adrs/0020-public-alpha-dogfood-channel.md", "docs/architecture/adrs/0021-ordered-assistant-content-records.md", "docs/architecture/adrs/0022-shared-ask-service-integration.md", "docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md", "docs/architecture/adrs/0024-deterministic-answer-plane.md", "docs/architecture/adrs/0025-release-conformance-evidence-gate.md", "docs/architecture/adrs/0026-trusted-ask-backend-vertical.md", "docs/architecture/adrs/0027-fumadocs-framework-dogfood.md", "docs/architecture/adrs/0028-public-package-consolidation.md", "docs/architecture/adrs/0029-renderers-as-chat-subpaths.md", "docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md", "docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md", "docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md", "docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md", "docs/architecture/adrs/0034-observability-recording-demo.md", "docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md", "docs/architecture/adrs/0036-drizzle-postgres-session-storage.md", "docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md", "docs/architecture/adrs/0038-reference-parts-adapter-delivery.md"]
tags: [guia, repo/agentskit-chat]
---

# Decisões - agentskit-chat

> [!tldr] Em linguagem comum
> Índice das decisões arquiteturais que orientam os contratos e módulos deste repositório.

← [[00 Hub - agentskit-chat]]

## Decisões por número

| Nota | Tema | Fonte |
|---|---|---|
| [[agentskit-chat ADR-0001 - Framework-neutral core with native renderers]] | Framework-neutral core with native renderers | `docs/architecture/adrs/0001-cross-framework-core.md:1` |
| [[agentskit-chat ADR-0002 - Upstream-first and no reimplementation]] | Upstream-first and no reimplementation | `docs/architecture/adrs/0002-upstream-first-no-reimplementation.md:1` |
| [[agentskit-chat ADR-0003 - Framework-neutral semantic fallback envelope]] | Framework-neutral semantic fallback envelope | `docs/architecture/adrs/0003-semantic-fallback-envelope.md:1` |
| [[agentskit-chat ADR-0004 - Snapshot-first v1 turn protocol]] | Snapshot-first v1 turn protocol | `docs/architecture/adrs/0004-snapshot-first-turn-protocol.md:1` |
| [[agentskit-chat ADR-0005 - Upstream memory-record validation]] | Upstream memory-record validation | `docs/architecture/adrs/0005-upstream-memory-record-validation.md:1` |
| [[agentskit-chat ADR-0006 - Session-scoped deterministic conversation]] | Session-scoped deterministic conversation | `docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md:1` |
| [[agentskit-chat ADR-0007 - Closed application component manifest]] | Closed application component manifest | `docs/architecture/adrs/0007-closed-application-component-manifest.md:1` |
| [[agentskit-chat ADR-0008 - Typed actions use upstream confirmation]] | Typed actions use upstream confirmation | `docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md:1` |
| [[agentskit-chat ADR-0009 - Trusted capability policy composes upstream authorization]] | Trusted capability policy composes upstream authorization | `docs/architecture/adrs/0009-trusted-capability-policy.md:1` |
| [[agentskit-chat ADR-0010 - Lifecycle lineage and monotonic snapshot cursor]] | Lifecycle lineage and monotonic snapshot cursor | `docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md:1` |
| [[agentskit-chat ADR-0011 - Application session metadata over AgentsKit ChatMemory]] | Application session metadata over AgentsKit ChatMemory | `docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md:1` |
| [[agentskit-chat ADR-0012 - Web-standard snapshot handler]] | Web-standard snapshot handler | `docs/architecture/adrs/0012-web-standard-snapshot-handler.md:1` |
| [[agentskit-chat ADR-0013 - Semantic application themes and native slots]] | Semantic application themes and native slots | `docs/architecture/adrs/0013-semantic-theme-native-slots.md:1` |
| [[agentskit-chat ADR-0014 - Safe application scaffolding in a dedicated CLI]] | Safe application scaffolding in a dedicated CLI | `docs/architecture/adrs/0014-safe-cli-scaffolding.md:1` |
| [[agentskit-chat ADR-0015 - Closed standard application component catalog]] | Closed standard application component catalog | `docs/architecture/adrs/0015-standard-component-catalog.md:1` |
| [[agentskit-chat ADR-0016 - Seven-renderer CLI and semantic component generation]] | Seven-renderer CLI and semantic component generation | `docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md:1` |
| [[agentskit-chat ADR-0017 - Application traces compose upstream replay]] | Application traces compose upstream replay | `docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md:1` |
| [[agentskit-chat ADR-0018 - Deterministic routes receive stable turn identity]] | Deterministic routes receive stable turn identity | `docs/architecture/adrs/0018-deterministic-route-identity-context.md:1` |
| [[agentskit-chat ADR-0019 - Session confirmation observers are isolated]] | Session confirmation observers are isolated | `docs/architecture/adrs/0019-session-confirmation-observers.md:1` |
| [[agentskit-chat ADR-0020 - Public alpha artifacts enable external dogfood]] | Public alpha artifacts enable external dogfood | `docs/architecture/adrs/0020-public-alpha-dogfood-channel.md:1` |
| [[agentskit-chat ADR-0021 - Ordered assistant content uses versioned JSON records]] | Ordered assistant content uses versioned JSON records | `docs/architecture/adrs/0021-ordered-assistant-content-records.md:1` |
| [[agentskit-chat ADR-0022 - Ask service integration is shared application]] | Ask service integration is shared application infrastructure | `docs/architecture/adrs/0022-shared-ask-service-integration.md:1` |
| [[agentskit-chat ADR-0023 - Conversation transitions use AgentsKit statechart]] | Conversation transitions use AgentsKit statechart | `docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md:1` |
| [[agentskit-chat ADR-0024 - Deterministic answers precede backend adapters]] | Deterministic answers precede backend adapters | `docs/architecture/adrs/0024-deterministic-answer-plane.md:1` |
| [[agentskit-chat ADR-0025 - Release conformance is a versioned evidence gate]] | Release conformance is a versioned evidence gate | `docs/architecture/adrs/0025-release-conformance-evidence-gate.md:1` |
| [[agentskit-chat ADR-0026 - Trusted Ask backend vertical]] | Trusted Ask backend vertical | `docs/architecture/adrs/0026-trusted-ask-backend-vertical.md:1` |
| [[agentskit-chat ADR-0027 - Fumadocs site is a first-class AgentsKit Chat dogfood host]] | Fumadocs site is a first-class AgentsKit Chat dogfood host | `docs/architecture/adrs/0027-fumadocs-framework-dogfood.md:1` |
| [[agentskit-chat ADR-0028 - — Public package consolidation]] | ADR-0028 — Public package consolidation | `docs/architecture/adrs/0028-public-package-consolidation.md:1` |
| [[agentskit-chat ADR-0029 - — Renderers as Chat subpaths]] | ADR-0029 — Renderers as Chat subpaths | `docs/architecture/adrs/0029-renderers-as-chat-subpaths.md:1` |
| [[agentskit-chat ADR-0030 - Certify ecosystem product chats through one application]] | Certify ecosystem product chats through one application layer | `docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md:1` |
| [[agentskit-chat ADR-0031 - Treat externally controlled chat as an application seam]] | Treat externally controlled chat as an application seam | `docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md:1` |
| [[agentskit-chat ADR-0032 - Certify exact supported versions per consumer]] | Certify exact supported versions per consumer | `docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md:1` |
| [[agentskit-chat ADR-0033 - Require a live fail-closed deprecation preflight]] | Require a live fail-closed deprecation preflight | `docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md:1` |
| [[agentskit-chat ADR-0034 - Observable incident demo composes AgentsKit]] | Observable incident demo composes AgentsKit | `docs/architecture/adrs/0034-observability-recording-demo.md:1` |
| [[agentskit-chat ADR-0035 - Additive referenced turn parts and host-owned upload]] | Additive referenced turn parts and host-owned upload policy | `docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md:1` |
| [[agentskit-chat ADR-0036 - Drizzle-Postgres application session envelopes]] | Drizzle/Postgres application session envelopes | `docs/architecture/adrs/0036-drizzle-postgres-session-storage.md:1` |
| [[agentskit-chat ADR-0037 - Durable action decisions and turn cost policy]] | Durable action decisions and turn cost policy | `docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md:1` |
| [[agentskit-chat ADR-0038 - Referenced parts are delivered at the adapter boundary]] | Referenced parts are delivered at the adapter boundary | `docs/architecture/adrs/0038-reference-parts-adapter-delivery.md:1` |
