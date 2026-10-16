---
tipo: grupo
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática; ownership consultado em doc-bridge.config.json; CLI indisponível"
fontes: ["apps/example-shared/src/index.ts", "docs/for-agents/index.md"]
tags: [grupo, repo/agentskit-chat, grupo/docs-e-exemplos]
---

# Docs e exemplos

> [!tldr] Em linguagem comum
> Este grupo reúne o portal público e hosts que mostram os mesmos comportamentos em cada framework.

← [[00 Hub - agentskit-chat]]

## Propriedade

`apps/docs` publica o portal Fumadocs; `apps/example-shared` contém definições reutilizadas pelos exemplos de React, Vue, Svelte, Solid, React Native e Ink, segundo `docs/for-agents/index.md:1` e as rotas de ownership em `doc-bridge.config.json:1`.

## Notas

| Nota | Papel |
|---|---|
| [[chat-docs]] | Documentação, demo e host Ask. |
| [[chat-example-shared]] | Definições e serviços injetáveis sem framework. |
| [[chat-example-react]] | Host React. |
| [[chat-example-vue]] | Host Vue. |
| [[chat-example-svelte]] | Host Svelte. |
| [[chat-example-solid]] | Host Solid. |
| [[chat-example-react-native]] | Host Expo nativo. |
| [[chat-example-ink]] | Host terminal e teste PTY. |
