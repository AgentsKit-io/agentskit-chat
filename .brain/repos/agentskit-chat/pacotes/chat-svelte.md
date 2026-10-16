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
fontes: ["agentskit-chat/packages/svelte/package.json", "agentskit-chat/packages/svelte/src/index.ts", "agentskit-chat/packages/svelte/src/types.ts", "agentskit-chat/packages/chat/package.json", "agentskit-chat/scripts/assemble-chat-package.mjs"]
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat-svelte

> [!tldr] Em linguagem comum
> Apresenta a definição compartilhada de conversa em svelte, usando o binding AgentsKit para mensagens, escolhas e componentes.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-core]], [[agentskit-svelte]], `svelte` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.
É distribuído como subpath de `@agentskit/chat/svelte`, em vez de pacote independente.

## O que entrega

Subpaths do manifesto: `.`.

Entradas nomeadas no código: `toChatCssVariables`, `toChatStyle`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/svelte/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/svelte/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit-chat/packages/svelte/src/types.ts:1`.

## Consumo por composição

[[chat]] incorpora este módulo na distribuição consolidada. Imports por subpath não aparecem necessariamente como dependência deste nome interno nos manifests dos apps. Ver `agentskit-chat/packages/chat/package.json:1` e `agentskit-chat/scripts/assemble-chat-package.mjs:7`.
