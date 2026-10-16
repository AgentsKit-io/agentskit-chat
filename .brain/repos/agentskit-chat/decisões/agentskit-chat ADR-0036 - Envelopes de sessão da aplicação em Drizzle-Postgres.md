---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0036-drizzle-postgres-session-storage.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0036 - Envelopes de sessão da aplicação em Drizzle-Postgres

> [!tldr] Em linguagem comum
> Quem usa PostgreSQL pode guardar os envelopes de sessão do Chat com Drizzle, com gravação protegida contra conflito; as mensagens continuam na memória do AgentsKit.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted for implementation (coordenador CH-B), 2026-10-06; revisão de evidência do pai pendente. Data: 2026-10-06. Fonte: `docs/architecture/adrs/0036-drizzle-postgres-session-storage.md`.

## Decisão em linguagem comum

Expõe `@agentskit/chat/drizzle-pg` como subpath com peer opcional do Drizzle. Guarda só o `SessionSnapshot` versionado existente na tabela `agentskit_chat_sessions`, chaveada por `(tenant_id, session_id)`; o insert usa `ON CONFLICT DO NOTHING`, o update compara a coluna de cursor no mesmo `UPDATE` SQL e retorna se uma linha mudou, e uma substituição precisa avançar o cursor. O código de sessão existente é dono de `SessionConflictError`, leases e do mapeamento HTTP 409. O host fornece um banco Drizzle node-postgres (Node pode usar pool; Workers usam um `pg Client` por requisição fechado em `waitUntil`); o DDL SQL é explícito e não roda no import; sinais de abort rejeitam antes do dispatch e statements já em andamento não são cancelados.

## Contexto e consequências

**Contexto.** Hosts em Node e Workers precisam de uma autoridade durável compartilhada entre conexões de pool e isolates de Worker para o envelope de sessão (ADR-0011). Um backend Drizzle geral de `ChatMemory` não existe upstream e precisa chegar lá antes de adoção; este subpath não o implementa. Mensagens canônicas continuam no `ChatMemory` upstream.

**Consequências.**

- O tenant vem da autenticação confiável do host e é aplicado a toda query; isolamento de aplicação não substitui RLS do banco.
- O nome de tabela fixo mantém a superfície pequena; migrações são do host.
- O PostgreSQL é a autoridade durável compartilhada entre conexões e isolates.

## Pacotes afetados

[[chat]] (`packages/chat/src/drizzle-pg.ts`: `chatSessionTable` `:11`, `chatSessionDDL` `:19`; teste `packages/chat/tests/drizzle-pg.test.ts`), suíte de contrato `tests/storage-pg/` (`pnpm test:storage:pg`, `package.json:52`), evidência `docs/ch-b-session-storage.md` e `docs/evidence/ch-b-session-storage.json`.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0036-drizzle-postgres-session-storage.md`.
