---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0019-session-confirmation-observers.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0019 - Observadores de confirmação de sessão isolados

> [!tldr] Em linguagem comum
> A aplicação pode observar cada mudança de confirmação (aprovada, negada, expirada) para auditoria, sem que uma falha no observador afete a ação.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-12. Fonte: `docs/architecture/adrs/0019-session-confirmation-observers.md`.

## Decisão em linguagem comum

`createChatSession` aceita um observador opcional `onConfirmationChange`, que recebe registros canônicos imutáveis depois que a persistência da sessão tem sucesso. A falha do observador é isolada e não pode alterar autorização, confirmação, execução nem persistência. O armazenamento durável continua sendo responsabilidade do store de sessão; sumidouros de auditoria consomem o observador à parte.

## Contexto e consequências

**Contexto.** Traces de auditoria precisam dos registros canônicos de confirmação (identidade da tool call, status terminal). Como os renderers criam coordenadores de confirmação via `ChatSession`, as definições não tinham ponto de observação suportado. Rejeitados: reconstruir a aprovação a partir da execução da tool (perde negação, expiração e correlação), callbacks por renderer e outro coordenador de confirmação.

**Consequências.**

- Todos os renderers expõem o mesmo ponto de auditoria via sessões preparadas.
- Uma falha de auditoria não transforma uma mutação já confirmada em falha de tool repetível.
- Observadores devem deduplicar registros se só querem transições de status.

## Pacotes afetados

[[chat]] (opção `onConfirmationChange` de `createChatSession`, `packages/chat/src/index.ts:690`), [[chat-devtools]] (usa `ActionConfirmation`, `packages/devtools/src/index.ts:2`).

## Substitui / substituído por

Complementa a [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]] e a [[agentskit-chat ADR-0009 - Política de capability confiável compõe a autorização do upstream]].

## Fonte

`docs/architecture/adrs/0019-session-confirmation-observers.md`.
