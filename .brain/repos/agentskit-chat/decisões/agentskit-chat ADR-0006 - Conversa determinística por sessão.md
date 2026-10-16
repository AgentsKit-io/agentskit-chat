---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0006 - Conversa determinística por sessão

> [!tldr] Em linguagem comum
> Comandos conhecidos são respondidos por regras fixas, sem chamar o modelo; o resto segue o caminho normal do AgentsKit. O progresso da conversa pertence a cada sessão, não à definição compartilhada.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md`.

## Decisão em linguagem comum

`createChatSession(definition)` cria uma sessão de aplicação nova e deriva um `ChatConfig` upstream embrulhando apenas o `AdapterFactory`. Rotas são avaliadas na ordem declarada; uma rota só é elegível se a restrição de estado casa e o evento é uma transição declarada a partir do estado atual. Um acerto emite um `StreamSource` determinístico compatível com o upstream, confirma a transição e registra a classificação do turno; um erro de rota delega o pedido intacto ao adapter original e registra um turno `agentic`. A taxonomia de traces é `deterministic`, `agentic`, `repaired`, `fallback` (sem conteúdo de prompt). Decisões determinísticas são cacheadas por identidade da mensagem e entrada; retry e regenerate repetem a mesma decisão sem chamar o modelo.

## Contexto e consequências

**Contexto.** Fluxos conhecidos devem rodar sem interpretação do modelo, mas a entrada não resolvida precisa manter todo o ciclo de vida do AgentsKit; o progresso não pode viver numa `ChatDefinition` compartilhada, que pode ser montada por vários usuários, renderers ou testes. Rejeitados: segundo controlador, matching dentro de cada renderer, estado mutável na definição e dependência de statechart geral (depois revertido pela ADR-0023).

**Consequências.**

- Comandos conhecidos evitam o modelo sem evitar o controlador upstream.
- Cada montagem recebe progresso de conversa isolado.
- Rotas não escolhem estados-alvo arbitrários; a máquina é dona das transições.
- Persistência, roteamento assíncrono, transporte e execução de ações ficam para outras decisões.

## Pacotes afetados

[[chat]] (`createChatSession` em `packages/chat/src/index.ts:690`, `commandRoute` em `:981`); os renderers compilam um config por montagem.

## Substitui / substituído por

O ponto 4 das alternativas (rejeitar statechart geral) foi revisto pela [[agentskit-chat ADR-0023 - Transições da conversa usam o statechart do AgentsKit]].

## Fonte

`docs/architecture/adrs/0006-session-scoped-deterministic-conversation.md`.
