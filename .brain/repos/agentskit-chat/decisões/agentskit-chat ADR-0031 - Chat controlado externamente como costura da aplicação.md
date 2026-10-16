---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação

> [!tldr] Em linguagem comum
> Um host que já controla a sessão e recebe snapshots prontos de outro processo pode usar a interface do Chat sem instanciar um segundo controlador.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted (HITL registrado em 2026-07-14). Data: 2026-07-14. Fonte: `docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md`.

## Decisão em linguagem comum

`@agentskit/chat` expõe um driver controlado neutro de framework. Sua entrada é um snapshot serializável limitado mais callbacks tipados como `Pick<ChatReturn>` sobre o ciclo de vida existente do AgentsKit; o invólucro do snapshot é estrito e as mensagens passam por `validateMemoryRecord` (`@agentskit/core/memory-validation`) antes de hidratar os timestamps ISO. O driver projeta estado e callbacks no contrato de apresentação `ChatReturn` existente e não cria controlador, não consome stream de adapter, não persiste mensagens nem traduz semântica de ciclo de vida. O shell React aceita o modo atual (definição própria) ou a fonte controlada; componentes de aquisição separados preservam as regras de hooks (o de definição chama `useChat` upstream, o controlado nunca), e ambos alimentam um mesmo componente de apresentação. O host continua responsável por autenticação, autorização, transporte, persistência, frescor do snapshot e por aplicar cada resultado de callback à sua fonte de verdade; snapshots inválidos falham de forma fechada antes da apresentação.

## Contexto e consequências

**Contexto.** Alguns hosts de produto já têm transporte de sessão confiável e recebem snapshots completos de outro processo; exigir um segundo controlador no cliente cria dois donos do ciclo de vida, e copiar a apresentação do Chat para cada host cria divergência de renderer. Rejeitados: controlador escondido a partir do snapshot, renderer React controlado separado, aceitar `Message[]` sem validação e copiar o schema de mensagens localmente.

**Consequências.**

- Hosts com sessões no servidor adotam o shell compartilhado sem runtime concorrente.
- Hosts existentes mantêm a API e o comportamento originais.
- Hosts controlados devem renderizar de novo com um novo snapshot após os callbacks; o driver não faz mutação otimista.

## Pacotes afetados

[[chat]] (`packages/chat/src/controlled.ts`; teste `packages/chat/tests/controlled-driver.test.ts`), [[chat-react]] (`packages/react/tests/controlled-agent-chat.test.tsx`), [[chat-ink]] (`packages/ink/src/index.tsx:272-282`, `packages/ink/tests/controlled-agent-chat.test.tsx`); exemplo `apps/example-ink/src/controlled.tsx`.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0031-controlled-chat-is-an-application-seam.md`.
