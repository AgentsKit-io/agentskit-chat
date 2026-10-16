---
tipo: fluxo
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática; doc-bridge CLI indisponível por pnpm ausente; fluxo mantido e backlinks conferidos; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["packages/chat/src/index.ts", "packages/server/src/index.ts"]
tags: [fluxo, repo/agentskit-chat, camada/ferramenta]
---

# AgentsChat - Sessão e retomada

> [!tldr] Em linguagem comum
> A conversa guarda não só mensagens, mas também estado e versão da definição. Ao reabrir, o sistema verifica se aquele registro ainda é compatível antes de retomá-lo.

← [[00 Hub - agentskit-chat]]

```mermaid
flowchart LR
  D[Definição e sessionId] --> S[Carrega snapshot]
  S --> V{Compatível?}
  V -- não --> E[Erro explícito]
  V -- sim --> R[Retoma sessão]
  R --> W[Salva com cursor esperado]
  W --> C{Conflito?}
  C -- sim --> F[SessionConflictError]
  C -- não --> O[Novo snapshot]
```

## Passo a passo

| Passo | O que acontece | Quem atua |
|---|---|---|
| Sessão | Monta uma sessão a partir da definição e opções. | [[chat]] |
| Protocolo | Valida snapshot e versão. | [[chat-protocol]] |
| Armazenamento | Recebe snapshot e cursor esperado; recusa gravação concorrente. | [[chat]] |
| HTTP | Autentica e entrega snapshots e eventos ao cliente quando o host usa servidor. | [[chat-server]] |
| Renderer | Mostra e opera a mesma sessão. | [[chat-react]] |

## Limites e dados

O pacote define interfaces de persistência; isso não prova um banco ativo. O subpath `@agentskit/chat/drizzle-pg` é uma opção pública. Retenção, identidade e recuperação após conflito pertencem à composição do hospedeiro.

> [!info]- Detalhe técnico
> - `packages/chat/src/index.ts:579` — storage.save com expectedCursor
> - `packages/chat/src/index.ts:690` — createChatSession
> - `packages/chat/src/index.ts:765-767` — cursor esperado, `buildSnapshot(cursor + 1)` e `SessionConflictError` quando `save` devolve `false`
> - `packages/chat/src/index.ts:599` — classe `SessionConflictError`
> - `packages/chat/src/index.ts:961` — resumeChatSession: sem snapshot salvo cria sessão nova (`:963`); snapshot inválido ou com `sessionId`/`definitionId`/`definitionRevision` diferentes falha via `invalidConversation` (`:965-969`)
> - `packages/server/src/index.ts:96` — handler HTTP
> - `packages/server/src/index.ts:150` — o handler chama `resumeChatSession` por requisição, com `storage` do host
> - Testes: `packages/chat/tests/define-chat.test.ts`, `packages/server/tests/handler.test.ts`, contrato Postgres em `tests/storage-pg/contract.ts` (`pnpm test:storage:pg`)
