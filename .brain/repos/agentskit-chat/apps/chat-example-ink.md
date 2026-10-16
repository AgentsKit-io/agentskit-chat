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
fontes: ["agentskit-chat/apps/example-ink/package.json", "agentskit-chat/apps/example-ink/src/index.tsx", "agentskit-chat/apps/example-ink/src/controlled.tsx"]
tags: [app, repo/agentskit-chat]
---

# @agentskit/chat-example-ink

> [!tldr] Em linguagem comum
> Demonstra os cenários compartilhados de conversa em ink, sem criar um segundo motor de agente.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat-example-shared]], [[agentskit-ink]], `ink`, `react`, [[chat]] |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Recebe texto no terminal e grava histórico em arquivo na demonstração do framework.

> [!info]- Detalhe técnico
> - `agentskit-chat/apps/example-ink/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/apps/example-ink/src/index.tsx:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit-chat/apps/example-ink/src/controlled.tsx:50`.
