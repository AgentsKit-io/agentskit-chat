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
fontes: ["agentskit-chat/packages/server/package.json", "agentskit-chat/packages/server/src/index.ts", "agentskit-chat/packages/server/src/uploads.ts", "agentskit-chat/packages/server/src/internal.ts", "agentskit-chat/packages/server/src/ask-service.ts", "agentskit-chat/packages/chat/package.json", "agentskit-chat/scripts/assemble-chat-package.mjs"]
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat-server

> [!tldr] Em linguagem comum
> Transforma uma definição de conversa em um atendente HTTP padrão. O hospedeiro fornece autenticação, execução e armazenamento.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[chat-protocol]], [[agentskit-net]], `aws4fetch`, [[agentskit-core]], [[agentskit-observability]] |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.
É distribuído como subpath de `@agentskit/chat/server`, em vez de pacote independente.

## O que entrega

Subpaths do manifesto: `.`.

Entradas nomeadas no código: `ChatHandlerError`, `createChatHandler`.

## Dados que entram e saem

Lê requisição e identidade, transmite eventos NDJSON e utiliza stores de sessão, custo e decisões quando injetadas pelo hospedeiro.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/server/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/server/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit-chat/packages/server/src/uploads.ts:27`.
> - Implementação exportada: `agentskit-chat/packages/server/src/internal.ts:4`.
> - Implementação exportada: `agentskit-chat/packages/server/src/ask-service.ts:133`.

## Consumo por composição

[[chat]] incorpora este módulo na distribuição consolidada. Imports por subpath não aparecem necessariamente como dependência deste nome interno nos manifests dos apps. Ver `agentskit-chat/packages/chat/package.json:1` e `agentskit-chat/scripts/assemble-chat-package.mjs:7`.

## Autorização e serviços

`createChatHandler` só autentica se o host fornecer `authenticate`; não se deve inferir autenticação obrigatória de toda instância. Já o contrato de `createAskServiceHandler` exige autenticação e resolução de site no servidor. Uploads, decisões de ações e custos são capacidades opcionais.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/server/src/index.ts:115` — checagem condicional de authenticate antes do body.
> - `agentskit-chat/packages/server/src/ask-service.ts:67` — opções obrigatórias do AskService.
