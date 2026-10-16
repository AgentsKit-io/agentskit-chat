---
tipo: guia
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "índice das decisões docs/architecture/adrs; doc-bridge CLI indisponível; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/adrs/0001-cross-framework-core.md", "docs/architecture/adrs/0002-upstream-first-no-reimplementation.md", "docs/architecture/adrs/0003-semantic-fallback-envelope.md", "docs/architecture/adrs/0004-snapshot-first-turn-protocol.md", "docs/architecture/adrs/0005-upstream-memory-record-validation.md", "docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md", "docs/architecture/adrs/0007-closed-application-component-manifest.md", "docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md", "docs/architecture/adrs/0009-trusted-capability-policy.md", "docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md", "docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md", "docs/architecture/adrs/0012-web-standard-snapshot-handler.md", "docs/architecture/adrs/0013-semantic-theme-native-slots.md", "docs/architecture/adrs/0014-safe-cli-scaffolding.md", "docs/architecture/adrs/0015-standard-component-catalog.md", "docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md", "docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md", "docs/architecture/adrs/0018-deterministic-route-identity-context.md", "docs/architecture/adrs/0019-session-confirmation-observers.md", "docs/architecture/adrs/0020-public-alpha-dogfood-channel.md", "docs/architecture/adrs/0021-ordered-assistant-content-records.md", "docs/architecture/adrs/0022-shared-ask-service-integration.md", "docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md", "docs/architecture/adrs/0024-deterministic-answer-plane.md", "docs/architecture/adrs/0025-release-conformance-evidence-gate.md", "docs/architecture/adrs/0026-trusted-ask-backend-vertical.md", "docs/architecture/adrs/0027-fumadocs-framework-dogfood.md", "docs/architecture/adrs/0028-public-package-consolidation.md", "docs/architecture/adrs/0029-renderers-as-chat-subpaths.md", "docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md", "docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md", "docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md", "docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md", "docs/architecture/adrs/0034-observability-recording-demo.md", "docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md", "docs/architecture/adrs/0036-drizzle-postgres-session-storage.md", "docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md", "docs/architecture/adrs/0038-reference-parts-adapter-delivery.md"]
tags: [guia, repo/agentskit-chat, camada/ferramenta]
---

# Decisões - agentskit-chat

> [!tldr] Em linguagem comum
> Índice das decisões arquiteturais que orientam os contratos e módulos deste repositório.

← [[00 Hub - agentskit-chat]]

## Por tema

| Tema | Decisões |
|---|---|
| Fronteira com o AgentsKit e neutralidade de framework | [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0002 - Upstream primeiro e sem reimplementação]], [[agentskit-chat ADR-0005 - Validação de registros de memória no upstream]], [[agentskit-chat ADR-0023 - Transições da conversa usam o statechart do AgentsKit]] |
| Protocolo de turno e sessão | [[agentskit-chat ADR-0004 - Protocolo de turno v1 baseado em snapshot]], [[agentskit-chat ADR-0010 - Linhagem do ciclo de vida e cursor monotônico de snapshot]], [[agentskit-chat ADR-0011 - Metadados de sessão da aplicação sobre o ChatMemory]], [[agentskit-chat ADR-0021 - Conteúdo ordenado do assistente em registros JSON versionados]], [[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]], [[agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host]], [[agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter]] |
| Conversa, rotas e componentes | [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]], [[agentskit-chat ADR-0006 - Conversa determinística por sessão]], [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0018 - Rotas determinísticas recebem identidade estável de turno]] |
| Ações, política e custo | [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0009 - Política de capability confiável compõe a autorização do upstream]], [[agentskit-chat ADR-0019 - Observadores de confirmação de sessão isolados]], [[agentskit-chat ADR-0037 - Decisões de ação duráveis e política de custo por turno]] |
| Servidor, Ask e respostas locais | [[agentskit-chat ADR-0012 - Handler de snapshot com padrões web]], [[agentskit-chat ADR-0022 - Integração com o serviço Ask é aplicação compartilhada]], [[agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend]], [[agentskit-chat ADR-0026 - Vertical confiável de backend do Ask]], [[agentskit-chat ADR-0036 - Envelopes de sessão da aplicação em Drizzle-Postgres]] |
| CLI e devtools | [[agentskit-chat ADR-0014 - Scaffolding seguro de aplicação numa CLI dedicada]], [[agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes]], [[agentskit-chat ADR-0017 - Traces da aplicação compõem o replay do upstream]] |
| Release, publicação e adoção | [[agentskit-chat ADR-0020 - Artefatos alfa públicos para dogfood externo]], [[agentskit-chat ADR-0025 - Conformidade de release como gate versionado de evidência]], [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]], [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]], [[agentskit-chat ADR-0032 - Certificar versões exatas suportadas por consumidor]], [[agentskit-chat ADR-0033 - Preflight de descontinuação ao vivo e fail-closed]] |
| Site e demos | [[agentskit-chat ADR-0027 - Site Fumadocs como host de dogfood de primeira classe]], [[agentskit-chat ADR-0034 - Demo de incidente observável compõe o AgentsKit]] |

## Estado e relações entre decisões

- **Propostas (ainda não aceitas na fonte):** ADR-0035, ADR-0037 e ADR-0038 (`status: proposto`). A ADR-0036 está "aceita para implementação", com revisão de evidência do pai pendente.
- **Substituições:** a ADR-0029 substitui a decisão de publicação de renderers da ADR-0028 (`docs/architecture/adrs/0028-public-package-consolidation.md:5`); a ADR-0007 reatribui a propriedade do schema de fallback da ADR-0003; a ADR-0023 revê a rejeição de statechart da ADR-0006; a ADR-0038 completa a ADR-0035; a ADR-0032 estende a ADR-0030.

## Decisões por número

| Nota | Tema | Fonte |
|---|---|---|
| [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]] | Framework-neutral core with native renderers | `docs/architecture/adrs/0001-cross-framework-core.md:1` |
| [[agentskit-chat ADR-0002 - Upstream primeiro e sem reimplementação]] | Upstream-first and no reimplementation | `docs/architecture/adrs/0002-upstream-first-no-reimplementation.md:1` |
| [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]] | Framework-neutral semantic fallback envelope | `docs/architecture/adrs/0003-semantic-fallback-envelope.md:1` |
| [[agentskit-chat ADR-0004 - Protocolo de turno v1 baseado em snapshot]] | Snapshot-first v1 turn protocol | `docs/architecture/adrs/0004-snapshot-first-turn-protocol.md:1` |
| [[agentskit-chat ADR-0005 - Validação de registros de memória no upstream]] | Upstream memory-record validation | `docs/architecture/adrs/0005-upstream-memory-record-validation.md:1` |
| [[agentskit-chat ADR-0006 - Conversa determinística por sessão]] | Session-scoped deterministic conversation | `docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md:1` |
| [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]] | Closed application component manifest | `docs/architecture/adrs/0007-closed-application-component-manifest.md:1` |
| [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]] | Typed actions use upstream confirmation | `docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md:1` |
| [[agentskit-chat ADR-0009 - Política de capability confiável compõe a autorização do upstream]] | Trusted capability policy composes upstream authorization | `docs/architecture/adrs/0009-trusted-capability-policy.md:1` |
| [[agentskit-chat ADR-0010 - Linhagem do ciclo de vida e cursor monotônico de snapshot]] | Lifecycle lineage and monotonic snapshot cursor | `docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md:1` |
| [[agentskit-chat ADR-0011 - Metadados de sessão da aplicação sobre o ChatMemory]] | Application session metadata over AgentsKit ChatMemory | `docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md:1` |
| [[agentskit-chat ADR-0012 - Handler de snapshot com padrões web]] | Web-standard snapshot handler | `docs/architecture/adrs/0012-web-standard-snapshot-handler.md:1` |
| [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]] | Semantic application themes and native slots | `docs/architecture/adrs/0013-semantic-theme-native-slots.md:1` |
| [[agentskit-chat ADR-0014 - Scaffolding seguro de aplicação numa CLI dedicada]] | Safe application scaffolding in a dedicated CLI | `docs/architecture/adrs/0014-safe-cli-scaffolding.md:1` |
| [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]] | Closed standard application component catalog | `docs/architecture/adrs/0015-standard-component-catalog.md:1` |
| [[agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes]] | Seven-renderer CLI and semantic component generation | `docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md:1` |
| [[agentskit-chat ADR-0017 - Traces da aplicação compõem o replay do upstream]] | Application traces compose upstream replay | `docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md:1` |
| [[agentskit-chat ADR-0018 - Rotas determinísticas recebem identidade estável de turno]] | Deterministic routes receive stable turn identity | `docs/architecture/adrs/0018-deterministic-route-identity-context.md:1` |
| [[agentskit-chat ADR-0019 - Observadores de confirmação de sessão isolados]] | Session confirmation observers are isolated | `docs/architecture/adrs/0019-session-confirmation-observers.md:1` |
| [[agentskit-chat ADR-0020 - Artefatos alfa públicos para dogfood externo]] | Public alpha artifacts enable external dogfood | `docs/architecture/adrs/0020-public-alpha-dogfood-channel.md:1` |
| [[agentskit-chat ADR-0021 - Conteúdo ordenado do assistente em registros JSON versionados]] | Ordered assistant content uses versioned JSON records | `docs/architecture/adrs/0021-ordered-assistant-content-records.md:1` |
| [[agentskit-chat ADR-0022 - Integração com o serviço Ask é aplicação compartilhada]] | Ask service integration is shared application infrastructure | `docs/architecture/adrs/0022-shared-ask-service-integration.md:1` |
| [[agentskit-chat ADR-0023 - Transições da conversa usam o statechart do AgentsKit]] | Conversation transitions use AgentsKit statechart | `docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md:1` |
| [[agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend]] | Deterministic answers precede backend adapters | `docs/architecture/adrs/0024-deterministic-answer-plane.md:1` |
| [[agentskit-chat ADR-0025 - Conformidade de release como gate versionado de evidência]] | Release conformance is a versioned evidence gate | `docs/architecture/adrs/0025-release-conformance-evidence-gate.md:1` |
| [[agentskit-chat ADR-0026 - Vertical confiável de backend do Ask]] | Trusted Ask backend vertical | `docs/architecture/adrs/0026-trusted-ask-backend-vertical.md:1` |
| [[agentskit-chat ADR-0027 - Site Fumadocs como host de dogfood de primeira classe]] | Fumadocs site is a first-class AgentsKit Chat dogfood host | `docs/architecture/adrs/0027-fumadocs-framework-dogfood.md:1` |
| [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]] | ADR-0028 — Public package consolidation | `docs/architecture/adrs/0028-public-package-consolidation.md:1` |
| [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]] | ADR-0029 — Renderers as Chat subpaths | `docs/architecture/adrs/0029-renderers-as-chat-subpaths.md:1` |
| [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]] | Certify ecosystem product chats through one application layer | `docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md:1` |
| [[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]] | Treat externally controlled chat as an application seam | `docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md:1` |
| [[agentskit-chat ADR-0032 - Certificar versões exatas suportadas por consumidor]] | Certify exact supported versions per consumer | `docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md:1` |
| [[agentskit-chat ADR-0033 - Preflight de descontinuação ao vivo e fail-closed]] | Require a live fail-closed deprecation preflight | `docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md:1` |
| [[agentskit-chat ADR-0034 - Demo de incidente observável compõe o AgentsKit]] | Observable incident demo composes AgentsKit | `docs/architecture/adrs/0034-observability-recording-demo.md:1` |
| [[agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host]] | Additive referenced turn parts and host-owned upload policy | `docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md:1` |
| [[agentskit-chat ADR-0036 - Envelopes de sessão da aplicação em Drizzle-Postgres]] | Drizzle/Postgres application session envelopes | `docs/architecture/adrs/0036-drizzle-postgres-session-storage.md:1` |
| [[agentskit-chat ADR-0037 - Decisões de ação duráveis e política de custo por turno]] | Durable action decisions and turn cost policy | `docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md:1` |
| [[agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter]] | Referenced parts are delivered at the adapter boundary | `docs/architecture/adrs/0038-reference-parts-adapter-delivery.md:1` |
