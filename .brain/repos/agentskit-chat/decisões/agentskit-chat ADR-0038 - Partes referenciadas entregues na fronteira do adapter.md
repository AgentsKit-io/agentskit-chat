---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "transcrição resumida do ADR versionado; análise estática"
fontes: ["docs/architecture/adrs/0038-reference-parts-adapter-delivery.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---

# agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter

> [!tldr] Em linguagem comum
> Resume uma decisão arquitetural que delimita contratos ou implementação no AgentsKit Chat.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status registrado na fonte: Proposed. Completes the delivery left open by [ADR-0035](./0035-referenced-turn-parts-and-upload-policy.md).. Data de verificação desta nota: 2026-10-16 (`docs/architecture/adrs/0038-reference-parts-adapter-delivery.md:1`).

## Decisão em linguagem comum

Referenced parts are delivered at the adapter boundary. O texto-fonte define o limite de arquitetura e suas consequências; consulte a fonte antes de alterar o contrato.

## Contexto e consequências

Resumo: ver a decisão completa em `docs/architecture/adrs/0038-reference-parts-adapter-delivery.md:1`. O corpo fonte contém contexto, decisão e consequências mantidos pelo projeto.

## Pacotes afetados

Consulte o índice [[00 Decisões - agentskit-chat]]; a associação por pacote deve ser lida com os handoffs de `docs/for-agents/` e não inferida pelo nome do ADR.

## Substitui / substituído por

Não declarado nesta nota; verifique a fonte.

## Fonte

`docs/architecture/adrs/0038-reference-parts-adapter-delivery.md`.
