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
fontes: ["agentskit-chat/packages/cli/package.json", "agentskit-chat/packages/cli/src/index.ts"]
npm: "@agentskit/chat-cli"
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat-cli

> [!tldr] Em linguagem comum
> Cria projetos de conversa e acrescenta componentes, conferindo a estrutura e recusando destinos existentes.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-cross-platform]], `zod` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Manifesto permite distribuição npm; a versão publicada não foi consultada.

## O que entrega

Subpaths do manifesto: `.`.

Entradas nomeadas no código: `CHAT_RENDERERS`, `ChatRendererSchema`, `ChatCliError`, `chat`, `handleChat`, `detectRenderer`, `initChatProject`, `addChatComponent`.

## Dados que entram e saem

Lê diretórios e manifestos e grava projetos e componentes no destino escolhido.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/cli/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/cli/src/index.ts:1` — entrada de código e composição
