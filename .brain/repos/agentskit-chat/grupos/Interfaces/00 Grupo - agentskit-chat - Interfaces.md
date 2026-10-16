---
tipo: grupo
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática; ownership e relações consultados em doc-bridge.config.json; CLI indisponível"
fontes: ["docs/for-agents/packages/cli.md"]
tags: [grupo, repo/agentskit-chat, grupo/interfaces, grupo/interfaces, camada/ferramenta]
---

# Interfaces

> [!tldr] Em linguagem comum
> Os bindings dão uma apresentação nativa a uma mesma definição de chat; a CLI gera projetos que usam essas integrações.

← [[00 Hub - agentskit-chat]]

## Fronteira

Cada shell deve consumir o binding correspondente do AgentsKit e preservar a lógica compartilhada sem importar primitivos de framework para os contratos comuns (`AGENTS.md:1`). A matriz de renderers fechada é declarada pela documentação de CLI em `docs/for-agents/packages/cli.md:1`.

## Módulos

| Nota | Plataforma |
|---|---|
| [[chat-react]] | React |
| [[chat-vue]] | Vue |
| [[chat-svelte]] | Svelte |
| [[chat-solid]] | Solid |
| [[chat-angular]] | Angular |
| [[chat-ink]] | Terminal Ink |
| [[chat-react-native]] | React Native |
| [[chat-cli]] | Detecção e scaffolding |

> [!info]- Detalhe técnico
> `doc-bridge.config.json:1` relaciona os pacotes aos contratos de definição de chat; `AGENTS.md:1` estabelece a interoperabilidade como requisito.
