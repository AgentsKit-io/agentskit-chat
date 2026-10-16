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
fontes: ["agentskit-chat/packages/chat/package.json", "agentskit-chat/packages/chat/src/index.ts", "agentskit-chat/packages/chat/src/catalog.ts", "agentskit-chat/packages/chat/src/ask.ts", "agentskit-chat/packages/chat/src/deterministic.ts"]
npm: "@agentskit/chat"
tags: [pacote, repo/agentskit-chat]
---

# @agentskit/chat

> [!tldr] Em linguagem comum
> Define o comportamento de uma aplicação de conversa uma vez: respostas locais, componentes, ações permitidas e sessões. Diferentes interfaces usam essa mesma definição.

← [[00 Hub - agentskit-chat]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-eval]], [[agentskit-memory]], [[agentskit-net]], [[agentskit-statechart]], `tslib`, `zod`, [[agentskit-angular]], [[agentskit-core]], [[agentskit-ink]], [[agentskit-react]], [[agentskit-react-native]], [[agentskit-solid]], [[agentskit-svelte]], [[agentskit-vue]], `@angular/common`, `@angular/core`, `ink`, `react`, `react-native`, `rxjs`, `solid-js`, `svelte`, `vue`, `drizzle-orm`, [[agentskit-observability]] |
| Usado por (produção/peer nestes dois repos) | [[agentskit-docs-next]], [[agentskit-registry]], [[chat-angular]], [[chat-cli]], [[chat-devtools]], [[chat-ink]], [[chat-react]], [[chat-react-native]], [[chat-server]], [[chat-solid]], [[chat-svelte]], [[chat-vue]], [[chat-docs]], [[chat-example-ink]], [[chat-example-react]], [[chat-example-react-native]], [[chat-example-shared]], [[chat-example-solid]], [[chat-example-svelte]], [[chat-example-vue]] |

Manifesto permite distribuição npm; a versão publicada não foi consultada.

## O que entrega

Subpaths do manifesto: `.`, `./protocol`, `./protocol/fixtures`, `./server`, `./devtools`, `./react`, `./react-native`, `./ink`, `./vue`, `./solid`, `./svelte`, `./angular`, `./drizzle-pg`.

Entradas nomeadas no código: `ChatThemeSchema`, `defaultChatTheme`, `resolveChatTheme`, `getLifecycleTargets`, `createCapabilityPolicy`, `withActionPolicy`, `resolveChoiceAction`, `createActionConfirmation`, `defineComponentManifest`, `resolveComponentFrame`, `createComponentInteraction`, `resolveComponentFallback`.

## Dados que entram e saem

Lê definição, mensagens e eventos; mantém sessão e salva snapshots por uma interface de storage com controle de cursor.

> [!info]- Detalhe técnico
> - `agentskit-chat/packages/chat/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit-chat/packages/chat/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit-chat/packages/chat/src/catalog.ts:3`.
> - Implementação exportada: `agentskit-chat/packages/chat/src/ask.ts:104`.
> - Implementação exportada: `agentskit-chat/packages/chat/src/deterministic.ts:23`.
