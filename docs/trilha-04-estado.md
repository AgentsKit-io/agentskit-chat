# Trilha 04 — estado real por etapa (2026-10-09)

Levantamento feito antes de qualquer implementação desta rodada. Fontes:
`AgentsKit-io/agentskit` em `origin/main` `cff4ba9b`, `AgentsKit-io/agentskit-chat`
em `origin/main` `9c431e9`, npm (`latest`) e `agentskit-os` `origin/main`.
PRD: `amberjack/docs/prd/04-agentskit-chat.md` (§9 etapas, §15 prevalece).

## Versões publicadas × `main`

| Pacote | npm `latest` | `main` (não publicado) |
|---|---|---|
| `@agentskit/core` | 1.14.1 | 1.15.0 pendente no PR "Version Packages" agentskit#1757 |
| `@agentskit/adapters` | 0.18.1 | 0.19.0 pendente (#1757) |
| `@agentskit/memory` | 0.11.14 | 0.12.0 pendente (#1757) |
| `@agentskit/observability` | 0.12.1 | 0.12.2 pendente (#1757), sem `CostStore` |
| `@agentskit/chat` / `chat-cli` | 0.5.0 | 0.5.0 |

O PR agentskit#1757 está aberto, `MERGEABLE`, 33 checks verdes e 3 ignorados. Nada
desta trilha que vive no `agentskit` foi publicado ainda.

## Etapas do PRD §9

| # | Etapa | Estado no `main` | Evidência | Falta |
|---|---|---|---|---|
| 0 | Estabilizar + regressões do spike | Feito | `packages/server/tests/known-gaps.test.ts` (chat), cenários 3/9 como `it.fails` | Converter os `it.fails` em testes verdes quando a3/a2 forem ligados no chat |
| 1 | a6 adapter livre + presets + docs (RF-01, 02, 06) | Feito, não publicado | agentskit#1826: `openaiCompatible`, `cloudflareAiGateway`, `workersAi`, `openRouter`; docs corrigidas; tabela `docs/adapter-modalities.md` | Publicar adapters 0.19.0. Chamada real a OpenRouter/AI Gateway não foi feita (sem credenciais). RF-03 é do starter (etapa 11) |
| 2 | a4 `SessionStorage` + `ChatMemory` Postgres (RF-12–16) | Feito; `SessionStorage` publicado, `ChatMemory` não | chat#198 (`@agentskit/chat/drizzle-pg`, publicado em 0.5.0); agentskit#1827 (`@agentskit/memory/postgres`) | Publicar memory 0.12.0. Neon/Hyperdrive reais não exercitados |
| 3 | a3 decide/resume + claim atômico (RF-17–24) | Só o lado core | agentskit#1828 + #1833: `ToolDecisionStore`, `controller.decide`, `AK_ACTION_NOT_FOUND`, `AK_ACTION_ALREADY_DECIDED`, 100×100 decides = 1 execução (store sintético) | **No chat:** evento `client.action.decide` no protocolo, handler, `ToolDecisionStore` Postgres, teste de 100 approves contra Postgres. Depende de core 1.15.0 publicado (AGENTS.md regra 9) |
| 4 | a5 `CostStore` durável + ledger (RF-25–29) | **Não feito** | `packages/observability/src/cost-guard*.ts` guardam estado em memória; não existe `CostStore` | Interface, implementação Postgres, suíte de contrato, guards aceitando o store; no chat, reserva no handler e 402 `QUOTA_EXCEEDED` |
| 5 | Release OSS 1 | Parcial | Changesets de a6/a4/a3-core no `main`; #1757 aberto | a5; a3 no chat; PR da matriz AKOS (`docs/COMPAT-MATRIX.md` ainda com pisos `core ^1.12.9`, `adapters ^0.17.0`, `memory ^0.11.10`) |
| 8 | a1 image/file parts nos adapters (RF-04, 05) | Feito, não publicado | agentskit#1826: serialização por provedor, `CAPABILITY_UNSUPPORTED`, captura HTTP em loopback | Publicar adapters 0.19.0; extração real com 50 recibos (gate M) |
| 9 | a2 parts no protocolo + upload por referência (RF-07–11) | Parcial, publicado em 0.5.0 | chat#199: schemas de parts, negociação de capacidade, `BlobStore` S3 (SigV4), `POST /uploads`, tenant cruzado 403, sha256 422 | Entrega ao adapter (RF-11) e 200 para turno com parts (RF-07): hoje 501 tipado, porque o core publicado só aceita `send(text)`. Depende de core 1.15.0. MinIO/R2 reais não exercitados (só SeaweedFS) |
| 10 | Release OSS 2 | Não iniciado | — | Etapa 9 completa + publicação |
| 6, 7, 11–14 | MOSS, Law OS, starter, produtos, a7/a8 | Fora desta tarefa | — | — |

## O que esta rodada faz, em ordem

1. a5 no `agentskit` (`@agentskit/observability`): `CostStore`, implementação
   Postgres, suíte de contrato, guards aceitando o store. PR com changeset.
2. a3 no chat: `client.action.decide`, handler, store de decisão Postgres, testes
   de concorrência e restart.
3. a5 no chat: reserva no handler, 402 `QUOTA_EXCEEDED`, aviso em 80%.
4. PR da matriz de compatibilidade na AKOS (sem merge).
5. a2 no chat: entrega das parts ao controller (RF-07, RF-11).

## Bloqueio de ordem conhecido

Os itens 2, 3 e 5 consomem APIs que só existem no `main` do `agentskit`. A regra 9
do `AGENTS.md` proíbe import privado ou fork: o `package.json` do chat só pode
apontar para versões publicadas. A validação local desses itens usa tarballs do
`main` do `agentskit` por override fora do commit; o CI do PR do chat só fica
verde depois que agentskit#1757 for publicado.
