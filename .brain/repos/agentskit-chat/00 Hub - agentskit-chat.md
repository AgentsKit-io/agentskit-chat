---
tipo: repo
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; relações e ownership consultados em doc-bridge.config.json; CLI indisponível (pnpm ausente), índice não gerado; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: [".github/workflows/ci.yml", "docs/architecture/overview.md", "docs/architecture/upstream-adoption.md"]
tags: [repo, repo/agentskit-chat, camada/ferramenta]
---

# agentskit-chat

> [!tldr] Em linguagem comum
> É a camada de aplicação que permite definir conversas, políticas, protocolos e componentes uma vez e apresentá-los em interfaces diferentes, delegando ao AgentsKit os primitivos de agente.

← [[00 Hub - Ecossistema AgentsKit]]

## Para que existe e quem usa

O repositório organiza definições de chat, contratos serializáveis, handlers HTTP, shells nativos, CLI e hosts demonstrativos. Sua fronteira é aplicação: controlador, lifecycle, adapters, tools, confirmação, memória/RAG, replay/eval e bindings pertencem ao AgentsKit upstream; integrações locais devem compor exports publicados, conforme a governança e a arquitetura descritas em `AGENTS.md:9-20` e `docs/architecture/overview.md:1`.

## Grupos, fluxos e navegação

| Nota | Papel |
|---|---|
| [[00 Grupo - agentskit-chat - Núcleo e protocolo]] | Definição, protocolo, servidor e devtools. |
| [[00 Grupo - agentskit-chat - Interfaces]] | Shells React, Vue, Svelte, Solid, Angular, Ink, React Native e CLI. |
| [[00 Grupo - agentskit-chat - Docs e exemplos]] | Portal e exemplos reutilizados entre frameworks. |
| [[AgentsChat - Resposta local e escalada]] | Consulta local determinística e encaminhamento opcional. |
| [[AgentsChat - Sessão e retomada]] | Persistência e retomada do envelope de sessão. |
| [[00 Decisões - agentskit-chat]] | Índice das decisões arquiteturais. |
| [[Guia - validar AgentsKit Chat]] | Comandos de validação e limites deste ambiente. |

## Publicação e validação

O workspace declara scripts de build, lint, testes, conformance, orçamento de bundle e gates de publicação em `package.json:8` (por exemplo `lint` `:11`, `test` `:13`, `test:conformance` `:14`, `test:pty` `:15`, `test:e2e` `:17`, `release:gate` `:34`). O CI roda, no job `quality` (`.github/workflows/ci.yml:17`): `pnpm lint`, `pnpm test:conformance`, `changeset status`, `pnpm test`, `pnpm build`, `check:public-api`, `conformance:gate`, `bundle:budget`, índice e gates do doc-bridge, `release-gate` e `pack-release`; mais os jobs `browser-e2e` (`:73`) e `ink-pty` (`:102`, também `test:expo`). A configuração de routing do doc-bridge lista 12 workspaces de `packages/`, 8 de `apps/` (sete exemplos + docs) e duas rotas lógicas de exemplo (`operations-reference`, `rag-reference`) em `doc-bridge.config.json:29-311`. Nesta auditoria o CLI do doc-bridge e o `pnpm` não foram executados; a configuração declarativa foi lida diretamente.

Arquitetura em uma frase: `@agentskit/chat` (publicado) agrega por subpaths o protocolo, o servidor, o devtools e os sete renderers (workspaces `private`), montados por `scripts/assemble-chat-package.mjs`; `@agentskit/chat-cli` é o único outro pacote público (`packages/chat/package.json:19-83`, `packages/cli/package.json:47-50`; [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]).

## Relações do ecossistema

| Nota | Relação |
|---|---|
| [[00 Hub - agentskit]] | Primitivos e bindings upstream consumidos pelos módulos. |
| [[00 Hub - doc-bridge]] | Indexação, roteamento documental e gate declarados na configuração. |
| [[00 Hub - agentskit-registry]] | Host/ecossistema consumidor e fonte de exemplos de integração. |
| [[00 Hub - agents-playbook]] | Host e documentação de padrões do ecossistema. |

> [!info]- Detalhe técnico
> - `AGENTS.md:5-31` — propósito, invariantes e ownership planejado.
> - `package.json:8` — comandos de workspace e validação.
> - `doc-bridge.config.json:1` — ownership, relações e comandos declarados.
> - `docs/architecture/upstream-adoption.md:1` — registros de adoção upstream.
