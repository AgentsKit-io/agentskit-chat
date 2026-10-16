---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0023 - Transições da conversa usam o statechart do AgentsKit

> [!tldr] Em linguagem comum
> As transições de estado da conversa passam a usar o pacote de statechart publicado pelo AgentsKit, em vez de uma implementação própria do Chat.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md`.

## Decisão em linguagem comum

`@agentskit/chat` consome `@agentskit/statechart`. Para cada `ConversationDefinition`, `createChatSession` compila estados e alvos de evento num `StatechartDefinition` upstream, cria uma instância imutável por sessão e a avança ou reconstrói só por `transitionStatechart`. `ConversationDefinition`, `ConversationSnapshot`, `ChatSession` e o envelope de sessão em fio permanecem inalterados; as rotas continuam locais (casam entrada, produzem respostas e decidem quando delegar ao adapter). O Chat valida só restrições de rota (identidade, precedência, restrição de estado e referências a estados declarados); estado inicial e alvos de transição são validados upstream e os diagnósticos viram o `ConfigError` público. A persistência continua guardando decisões e estado atuais; ao retomar ou reparar o histórico, as decisões retidas são reexecutadas pelo statechart.

## Contexto e consequências

**Contexto.** A ADR-0006 introduziu a menor implementação finita de transições porque o AgentsKit não tinha um primitivo geral; agora publica `@agentskit/statechart@0.2.0` (issue #1199, PR #1210). Manter validação e atribuição equivalentes no Chat violaria a ADR-0002. Rejeitados: manter a implementação local, expor `StatechartDefinition` direto na `ChatDefinition`, persistir um segundo snapshot de statechart e importar fonte não publicada.

**Consequências.**

- O AgentsKit é a fonte única da validação e execução reutilizáveis de transições.
- Definições, renderers e envelopes de sessão v1 existentes continuam compatíveis.
- Reconstruir uma sessão faz pequenas transições síncronas para as decisões retidas.
- Mudanças incompatíveis no statechart exigem release upstream e revisão de compatibilidade.

## Pacotes afetados

[[chat]] (importa `createStatechartInstance`, `defineStatechart`, `transitionStatechart` em `packages/chat/src/index.ts:3`; dependência `@agentskit/statechart` em `packages/chat/package.json:174`).

## Substitui / substituído por

Revê a decisão de não depender de um statechart geral da [[agentskit-chat ADR-0006 - Conversa determinística por sessão]].

## Fonte

`docs/architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md`.
