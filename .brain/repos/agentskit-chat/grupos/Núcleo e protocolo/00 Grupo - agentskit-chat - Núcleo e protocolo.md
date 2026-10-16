---
tipo: grupo
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática; mapa declarativo consultado em doc-bridge.config.json; doc-bridge CLI indisponível"
fontes: ["docs/architecture/overview.md"]
tags: [grupo, repo/agentskit-chat, grupo/nucleo-e-protocolo]
---

# Núcleo e protocolo

> [!tldr] Em linguagem comum
> Este grupo define a aplicação conversacional, os contratos que atravessam processos, o servidor de integração e as ferramentas para observar execuções.

← [[00 Hub - agentskit-chat]]

## Responsabilidade

Concentra as fronteiras framework-neutral e Web-standard. A definição local compõe APIs publicadas do AgentsKit; schemas versionados validam dados externos; servidor injeta autenticação e infraestrutura do host; devtools compõe replay upstream. O limite não inclui controller, lifecycle, execução de tools, memória ou replay próprios (`AGENTS.md:1`, `docs/architecture/overview.md:1`).

## Módulos

| Nota | Responsabilidade |
|---|---|
| [[chat]] | Definições, políticas, rotas, sessões e catálogo semântico. |
| [[chat-protocol]] | Eventos, envelopes versionados, validação e fixtures. |
| [[chat-server]] | Handlers Request/Response, Ask, uploads e persistência injetada. |
| [[chat-devtools]] | Captura de rastros e comparação semântica. |

> [!info]- Detalhe técnico
> `doc-bridge.config.json:1` lista ownership e arestas entre `@agentskit/chat`, protocolo e servidor. `AGENTS.md:1` define a regra upstream-first.
