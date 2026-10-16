---
tipo: app
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit-chat/apps/example-solid/package.json", "agentskit-chat/apps/example-solid/src/App.tsx"]
tags: [app, repo/agentskit-chat]
---

# @agentskit/chat-example-solid

> [!tldr] Em linguagem comum
> Demonstra os cenários compartilhados de conversa em solid, sem criar um segundo motor de agente.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[chat-example-shared]], [[agentskit-core]], [[agentskit-solid]], `solid-js` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

Entradas nomeadas no código: `App`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit-chat/apps/example-solid/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/apps/example-solid/src/App.tsx:1` — entrada de código e composição
