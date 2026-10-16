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
fontes: ["agentskit-chat/apps/example-shared/package.json", "agentskit-chat/apps/example-shared/src/index.ts"]
tags: [app, repo/agentskit-chat]
---

# @agentskit/chat-example-shared

> [!tldr] Em linguagem comum
> Reúne cenários compartilhados de suporte, integração inicial, operações e busca com fontes, reutilizados pelos exemplos.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-core]], [[agentskit-rag]], [[agentskit-validation]] |
| Usado por (produção/peer nestes dois repos) | [[chat-example-ink]], [[chat-example-react]], [[chat-example-react-native]], [[chat-example-solid]], [[chat-example-svelte]], [[chat-example-vue]] |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Subpaths do manifesto: `.`.

Entradas nomeadas no código: `helloWorldChat`, `createInMemoryTicketService`, `createSupportApplication`, `supportTicketService`, `supportHostContext`, `supportChat`, `supportSession`, `createOnboardingApplication`, `onboardingApplication`, `createInMemoryOperationsService`, `createOperationsApplication`, `operationsApplication`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit-chat/apps/example-shared/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/apps/example-shared/src/index.ts:1` — entrada de código e composição
