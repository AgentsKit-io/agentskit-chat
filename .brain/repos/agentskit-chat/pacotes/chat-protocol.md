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
fontes: ["agentskit-chat/packages/protocol/package.json", "agentskit-chat/packages/protocol/src/index.ts", "agentskit-chat/packages/protocol/src/ask.ts", "agentskit-chat/packages/protocol/src/backend.ts", "agentskit-chat/packages/protocol/src/deterministic.ts", "agentskit-chat/packages/chat/package.json", "agentskit-chat/scripts/assemble-chat-package.mjs"]
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat-protocol

> [!tldr] Em linguagem comum
> Define e confere mensagens entre interface e servidor, componentes apresentados e registros de sessão. Mantém as interfaces falando o mesmo idioma.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | `@noble/hashes`, `zod`, [[agentskit-core]] |
| Usado por (produção/peer nestes dois repos) | [[chat-server]] |

Workspace interno com código público; `private: true` impede publicação npm independente.
É distribuído como subpath de `@agentskit/chat/protocol`, em vez de pacote independente.

## O que entrega

Subpaths do manifesto: `.`, `./fixtures`.

Entradas nomeadas no código: `TURN_PROTOCOL`, `TURN_PROTOCOL_VERSION`, `COMPONENT_PROTOCOL`, `COMPONENT_PROTOCOL_VERSION`, `ASSISTANT_CONTENT_PROTOCOL`, `ASSISTANT_CONTENT_PROTOCOL_VERSION`, `ASSISTANT_CONTENT_PREFIX`, `ASSISTANT_CONTENT_MAX_BYTES`, `ASSISTANT_CONTENT_MAX_RECORDS`, `ComponentKeySchema`, `ComponentFallbackSchema`, `ComponentRenderFrameSchema`.

## Dados que entram e saem

Lê e valida envelopes, conteúdo e snapshots; não escolhe um banco.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/protocol/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/protocol/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit-chat/packages/protocol/src/ask.ts:3`.
> - Implementação exportada: `agentskit-chat/packages/protocol/src/backend.ts:5`.
> - Implementação exportada: `agentskit-chat/packages/protocol/src/deterministic.ts:5`.

## Consumo por composição

[[chat]] incorpora este módulo na distribuição consolidada. Imports por subpath não aparecem necessariamente como dependência deste nome interno nos manifests dos apps. Ver `agentskit-chat/packages/chat/package.json:1` e `agentskit-chat/scripts/assemble-chat-package.mjs:7`.
