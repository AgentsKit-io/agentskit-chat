---
tipo: repo
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; relações e ownership consultados em doc-bridge.config.json; CLI indisponível (pnpm ausente), índice não gerado"
fontes: [".github/workflows/ci.yml", "docs/architecture/overview.md", "docs/architecture/upstream-adoption.md"]
tags: [repo, repo/agentskit-chat, camada/ferramenta]
---

# agentskit-chat

> [!tldr] Em linguagem comum
> É a camada de aplicação que permite definir conversas, políticas, protocolos e componentes uma vez e apresentá-los em interfaces diferentes, delegando ao AgentsKit os primitivos de agente.

← [[00 Hub - Ecossistema AgentsKit]]

## Para que existe e quem usa

O repositório organiza definições de chat, contratos serializáveis, handlers HTTP, shells nativos, CLI e hosts demonstrativos. Sua fronteira é aplicação: controlador, lifecycle, adapters, tools, confirmação, memória/RAG, replay/eval e bindings pertencem ao AgentsKit upstream; integrações locais devem compor exports publicados, conforme a governança e a arquitetura descritas em `AGENTS.md:1` e `docs/architecture/overview.md:1`.

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

O workspace declara scripts de build, lint, testes, conformance, orçamento de bundle e gates de publicação em `package.json:8`. A configuração de routing do doc-bridge descreve os 12 workspaces de packages e as apps em `doc-bridge.config.json:1`. A tentativa de executar o fluxo de índice não avançou porque `pnpm` não está instalado; logo, nenhuma saída do CLI foi usada como evidência. A configuração declarativa foi consultada para relações/ownership.

## Relações do ecossistema

| Nota | Relação |
|---|---|
| [[00 Hub - agentskit]] | Primitivos e bindings upstream consumidos pelos módulos. |
| [[00 Hub - doc-bridge]] | Indexação, roteamento documental e gate declarados na configuração. |
| [[00 Hub - agentskit-registry]] | Host/ecossistema consumidor e fonte de exemplos de integração. |
| [[00 Hub - agents-playbook]] | Host e documentação de padrões do ecossistema. |

> [!info]- Detalhe técnico
> - `AGENTS.md:1` — propósito, invariantes e ownership planejado.
> - `package.json:8` — comandos de workspace e validação.
> - `doc-bridge.config.json:1` — ownership, relações e comandos declarados.
> - `docs/architecture/upstream-adoption.md:1` — registros de adoção upstream.
