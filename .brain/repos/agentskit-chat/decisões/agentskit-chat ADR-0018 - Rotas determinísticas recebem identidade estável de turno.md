---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0018-deterministic-route-identity-context.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0018 - Rotas determinísticas recebem identidade estável de turno

> [!tldr] Em linguagem comum
> Rotas determinísticas recebem a identidade da sessão e da mensagem, para que cada turno gere um componente com identidade própria e estável no replay.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0018-deterministic-route-identity-context.md`.

## Decisão em linguagem comum

`DeterministicRoute.response` recebe um segundo argumento de contexto aditivo com o `sessionId` da aplicação e o `messageId` opcional da mensagem do usuário no upstream; callbacks de um argumento continuam compatíveis. Rotas que produzem componentes derivam a identidade da instância da identidade da mensagem, de modo que replay/regenerate devolve o frame em cache e turnos distintos ficam independentes. O contexto contém só metadados de identidade — nunca estado mutável da sessão, mensagens, internos do modelo nem um segundo controlador.

## Contexto e consequências

**Contexto.** A ADR-0006 faz cache por identidade da mensagem, mas os callbacks só recebiam o texto; um `instanceId` constante deixaria instâncias posteriores inertes e um contador global tornaria o replay dependente de sessões não relacionadas. Rejeitados: identidade constante, contador global da definição e id aleatório no callback.

**Consequências.**

- Rotas de componente repetidas continuam interativas dentro de uma sessão.
- O replay determinístico preserva a identidade original do componente.
- Chamadas diretas ao adapter sem mensagem de usuário podem cair na identidade da sessão.
- É preocupação de roteamento da aplicação; não duplica primitivo do AgentsKit.

## Pacotes afetados

[[chat]] (`DeterministicRoute` e `createChatSession` em `packages/chat/src/index.ts`); consumidores de exemplo em [[chat-example-shared]].

## Substitui / substituído por

Complementa a [[agentskit-chat ADR-0006 - Conversa determinística por sessão]].

## Fonte

`docs/architecture/adrs/0018-deterministic-route-identity-context.md`.
