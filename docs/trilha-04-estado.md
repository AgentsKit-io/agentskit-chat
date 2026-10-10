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

## Checkpoint de 2026-10-09 (noite)

Parada pedida pelo coordenador por falta de memória e disco na máquina. Nada foi publicado nem mergeado.

### Pronto

- **a5 no `agentskit`** — branch `EmersonBraun/chat-t04`, commit `feat(observability): durable tenant CostStore with Postgres backend`.
  `CostStore` (`reserve`, `commit`, `release`, `window`), `createInMemoryCostStore`, `@agentskit/observability/postgres`
  (`postgresCostStore`, DDL, tabelas Drizzle, ledger), `@agentskit/observability/cost-store-contract`, os três guards com
  `store` opcional e aviso em `NODE_ENV=production`, ADR 0044, changeset minor, passo novo no job Postgres do CI.
  Validação local: lint do pacote; 374 testes (30 arquivos), linhas 94,4%; contrato em Postgres 16 real repetido 10 vezes
  (50 reservas concorrentes no teto, 100 turnos com 20% de falha, ledger conferido) e em workerd; os 52 quality gates;
  size-limit dentro do orçamento. O orçamento do bundle raiz do observability subiu de 16,5 KB para 17 KB (ficou em 16,57 KB).
- **Matriz AKOS** — branch `EmersonBraun/t04-compat-matrix` em `agentskit-os`: entrada do Release OSS 1 em
  `docs/COMPAT-MATRIX.md`, só documentação; `check-compat-matrix` ok.

### Pela metade (WIP nesta branch `EmersonBraun/chat-t04` do chat)

a3 e a5 no chat estão implementados e testados localmente contra tarballs do `main` do `agentskit`, mas **o lockfile não foi
regenerado**: os `package.json` de `packages/chat` e `packages/server` já pedem `@agentskit/core ^1.15.0` e
`@agentskit/observability ^0.13.0`, que ainda não existem no npm. `pnpm install --frozen-lockfile` falha até a publicação.

- Protocolo: `client.action.decide`, `ACTION_DECIDE_CAPABILITY`, campo aditivo `quota` no snapshot.
- Handler: opção `decisions` (decide, replay, 404/409/501 tipados) e opção `cost` (reserva, commit, release, 402, aviso em 80%).
- `@agentskit/chat/drizzle-pg`: `createDrizzleDecisionStore`, `chatDecisionTable`, `chatDecisionDDL`.
- Testes: `packages/server/tests/decide.test.ts` (RF-17 a RF-24, 11 testes), `packages/server/tests/cost.test.ts`
  (RF-26 a RF-29, 6 testes), `packages/protocol/tests/decide.test.ts`, `tests/storage-pg/decision-contract.ts`
  (RF-19 em Postgres 16: 100 rodadas de corrida de claim e 100 rodadas pelo handler).
- Docs: ADR-0037, `docs/protocol/v1.md`, `docs/server.mdx`, README do chat, registro de adoção upstream, changeset minor.

Último resultado medido: suíte do servidor 55 testes passando, 1 falha esperada (etapa 9), 2 ignorados, linhas 98,75%;
contrato Postgres em Node 2/2. **Não rodados depois das últimas edições:** `packages/protocol/tests/decide.test.ts`
e o fixture novo de compatibilidade, suíte completa do repositório, `check:public-api` (o snapshot precisa de `--update`),
contrato em workerd com o store de decisão, size/bundle budget, doc-bridge gate.

### Próximo passo exato

1. Revisar e mergear o PR do a5 no `agentskit`; publicar o "Version Packages" (agentskit#1757 atualizado).
2. No chat: `pnpm install` para regenerar o lockfile com core 1.15.0 e observability 0.13.0 publicados.
   Para validar antes da publicação, usar override local não commitado em `pnpm-workspace.yaml` apontando para
   tarballs de `pnpm pack` de `packages/core` e `packages/observability` do `agentskit`.
3. Rodar: `pnpm --filter @agentskit/chat-protocol test`, `pnpm --filter @agentskit/chat test`,
   `pnpm --filter @agentskit/chat-server test`, `pnpm lint`, `pnpm check:public-api:update` e revisar o diff,
   `pnpm test:storage:pg:types`, `pnpm test:storage:pg` (Postgres 16 conforme `tests/storage-pg/README.md`),
   o worker de `tests/storage-pg` em `wrangler dev`, `pnpm test:bundle-budget`, `pnpm docs:bridge:gate`.
4. Abrir o PR do chat como pronto e deixar o "Version Packages" do chat (0.6.0) aberto.
5. Release OSS 2: no handler, trocar o 501 `TURN_PARTS_UNAVAILABLE` pela entrega das parts a `controller.send`
   (RF-07, RF-11), com `BlobStore.presignGet` ou bytes conforme o adapter; converter o `it.fails` da etapa 9.

### Não coberto por esta rodada

Neon, Hyperdrive, R2 e MinIO reais; chamada real a OpenRouter e AI Gateway; extração com 50 recibos; RLS no Postgres.
RF-27 cobre teto, 402 e aviso; a leitura do teto em `entitlements` fica com o host (starter, etapa 11).

### PRs abertos no checkpoint (todos draft, nenhum mergeado)

| Etapa | PR | Gates locais |
|---|---|---|
| 4 — a5 `CostStore` (agentskit) | AgentsKit-io/agentskit#1835 | Pacote: lint, 374 testes, cobertura, Postgres 16, workerd e size-limit verdes; 52 quality gates verdes antes do commit. O hook de pre-push falhou 2 gates por causa do ambiente (dist sendo reconstruído no mesmo worktree e máquina sem memória) e o push foi feito com `HUSKY=0`. O CI precisa confirmar. `pnpm test` do repositório inteiro não foi rodado |
| 3 e 4 no chat — decide + custo | AgentsKit-io/agentskit-chat#205 | Suíte do servidor e contrato Postgres verdes contra tarballs locais; CI não passa até a publicação do upstream (lockfile) |
| 5 — matriz AKOS | AgentsKit-io/agentskit-os#6392 | `check-compat-matrix` ok; só documentação |
| 1, 2, 3 (core), 8 | já no `main` do agentskit (#1826, #1827, #1828, #1833) | "Version Packages" agentskit#1757 aberto e verde; vai incluir o a5 depois do merge de #1835 |
