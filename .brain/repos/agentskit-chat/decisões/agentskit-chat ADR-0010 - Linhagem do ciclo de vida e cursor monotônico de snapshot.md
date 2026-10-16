---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0010 - Linhagem do ciclo de vida e cursor monotônico de snapshot

> [!tldr] Em linguagem comum
> Cada snapshot diz de qual operação veio (retry, edição…) e o cliente só aceita snapshots mais novos, então reconexões e duplicatas não voltam a conversa no tempo.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md`.

## Decisão em linguagem comum

O campo opcional `lineage` do snapshot v1 registra a operação e as identidades opcionais de turno/mensagem de origem; como é aditivo, a versão do envelope continua 1. `createSnapshotEvent` projeta as mensagens canônicas e a ascendência explícita. `createTurnSnapshotCursor(sessionId)` fixa a sessão confiável, aceita o primeiro snapshot completo válido como estado de reconexão e depois só aceita sequência maior; duplicados, antigos, de outra sessão, malformados e eventos que não são snapshot são inertes; o estado aceito é congelado em profundidade; o cursor não faz merge nem interpreta chunks. Renderers delegam retry/edit/regenerate ao binding do AgentsKit.

## Contexto e consequências

**Contexto.** A ADR-0004 escolheu snapshots completos e adiou a rejeição de sequência com estado. Retry, edição e regeneração agora precisam de ascendência explícita, e reconexão/duplicata não pode retroceder o cliente. O AgentsKit já é dono de streaming, abort, retry, edit, regenerate e rejeição de chunks tardios.

**Consequências.**

- A ascendência do ciclo de vida é transportável sem alterar as mensagens canônicas.
- Reconexão e duplicação têm uma regra monotônica neutra.
- Sequências são monotônicas por sessão; sessão nova começa com cursor novo.
- Protocolo de deltas ou merge entre sessões exige nova ADR e versão.

## Pacotes afetados

[[chat-protocol]] (`createSnapshotEvent`, `createTurnSnapshotCursor`), [[chat-server]] (emite snapshots), todos os renderers.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0010-lifecycle-lineage-and-snapshot-cursor.md`.
