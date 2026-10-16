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
fontes: ["agentskit-chat/apps/docs/package.json", "agentskit-chat/apps/docs/app/demo/agent-observability/page.tsx"]
tags: [app, repo/agentskit-chat]
---

# @agentskit/chat-docs

> [!tldr] Em linguagem comum
> É o site de guias e demonstrações do AgentsKit Chat, com Next.js e Fumadocs.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-react]], `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `mermaid`, `next`, `react`, `react-dom`, `yaml`, `zod` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

Entradas nomeadas no código: `metadata`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit-chat/apps/docs/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/apps/docs/app/demo/agent-observability/page.tsx:1` — entrada de código e composição
