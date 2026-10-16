---
tipo: pacote
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit-chat/packages/devtools/package.json", "agentskit-chat/packages/devtools/src/index.ts", "agentskit-chat/packages/chat/package.json", "agentskit-chat/scripts/assemble-chat-package.mjs"]
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat-devtools

> [!tldr] Em linguagem comum
> Captura e reproduz rastros para comparar o comportamento entre interfaces e investigar erros.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-eval]], `zod` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.
É distribuído como subpath de `@agentskit/chat/devtools`, em vez de pacote independente.

## O que entrega

Subpaths do manifesto: `.`.

Entradas nomeadas no código: `TraceCategorySchema`, `ApplicationTraceRecordSchema`, `createTraceCapture`, `captureTurnTrace`, `captureActionPolicyTrace`, `captureActionTrace`, `ReplayFixtureSchema`, `createReplayFixture`, `serializeReplayFixture`, `parseReplayFixture`, `SemanticOutcomeSchema`, `RendererOutcomeSchema`.

## Dados que entram e saem

Lê eventos e cassettes e produz rastros validados e material de replay; a configuração controla redação de dados.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/devtools/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/devtools/src/index.ts:1` — entrada de código e composição

## Consumo por composição

[[chat]] incorpora este módulo na distribuição consolidada. Imports por subpath não aparecem necessariamente como dependência deste nome interno nos manifests dos apps. Ver `agentskit-chat/packages/chat/package.json:1` e `agentskit-chat/scripts/assemble-chat-package.mjs:7`.
