---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0013-semantic-theme-native-slots.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos

> [!tldr] Em linguagem comum
> Um tema simples (cores, espaçamento, raio, fonte) vale para todas as interfaces, e cada uma o traduz do seu jeito; trocar partes da tela é feito com "slots" nativos que nunca entram na definição compartilhada.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted — HITL approved 2026-07-11. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0013-semantic-theme-native-slots.md`.

## Decisão em linguagem comum

`@agentskit/chat` é dono de um tema semântico pequeno e validado (cores, espaçamento, raio, família de fonte). Os renderers o traduzem apenas por seams publicados do AgentsKit: React usa variáveis CSS `--ak-*` e ganchos `data-ak-*`; React Native usa pass-throughs de `style` e estilos nativos; Ink mapeia as cores suportadas para um `InkTheme` completo via `InkThemeProvider` (espaçamento e tipografia são intencionalmente não suportados no terminal). Cada renderer expõe slots nativos para container, mensagem, input, indicador de "pensando", confirmação e `ChoiceList`; slots nunca entram na definição compartilhada. Quem precisa de estado headless importa o `useChat` do binding do AgentsKit.

## Contexto e consequências

**Contexto.** Era preciso uma intenção visual única para hosts DOM, nativos e de terminal sem mover primitivos de framework para a definição nem recriar bindings de UI. Rejeitados: árvore de componentes universal, segundo hook headless e design system local. A seam de estilo de texto do React Native foi adicionada upstream (#1158/#1159, `@agentskit/react-native@0.4.4`).

**Consequências.**

- Uma definição pode ser re-estilizada sem condicionais por renderer.
- O mapeamento respeita as capacidades de cada plataforma.
- Slots ficam idiomáticos e tipados por renderer.
- Substituir os padrões transfere ao host a responsabilidade de acessibilidade.

## Pacotes afetados

[[chat]] (`resolveChatTheme`), [[chat-react]] (`toChatCssVariables`, `packages/react/src/index.tsx:19`), [[chat-vue]], [[chat-svelte]] (`packages/svelte/src/index.ts:11`), [[chat-angular]] (`packages/angular/src/index.ts:14`), [[chat-react-native]], [[chat-ink]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0013-semantic-theme-native-slots.md`.
