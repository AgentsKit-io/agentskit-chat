# Playbook da fábrica — agentskit-chat

Repo público: só dados sintéticos (ver AGENTS.md). Monorepo pnpm; pacotes em `packages/*`, exemplos em `apps/*`.

## 1. Instalar
- Node 22, pnpm 10.33.0 (`packageManager` no package.json; o CI usa os mesmos).
- Comando do CI: `pnpm install --frozen-lockfile`.
- Lockfile desatualizado: rode `pnpm install` (sem flag), commite só o `pnpm-lock.yaml` junto com o `package.json` que mudou. Nunca edite o lock à mão.
- Variáveis: nenhuma é necessária para lint/testes unitários. Testes de Postgres usam `chat_test` em `localhost:56439` (ver seção 2); não use banco real.
- `postinstall` roda `scripts/ensure-node-pty-helper.mjs`; falha aqui costuma ser rede/permissão, não código.

## 2. Rodar localmente
- Exemplo React: `pnpm build` e depois `pnpm dev` (`@agentskit/chat-example-react`, Vite).
- Postgres de teste (só para `test:storage:pg`, `test:runtime:pg`, `test:migrations:pg`): imagem `postgres:16`, usuário `chat_test`, banco `chat_test`, porta host 56439, `POSTGRES_HOST_AUTH_METHOD=trust`. Sem Docker/Postgres, esses testes não rodam localmente; o job `runtime-contract` do CI cobre.

## 3. Verificação rápida (diff pequeno)
1. `pnpm lint` — roda `tsc --noEmit` em cada pacote + `agentskit-cross-platform check`. É o typecheck do repo.
2. Pacote alterado: `pnpm --filter @agentskit/chat-react test` (troque o nome; confira em `packages/<x>/package.json`). Esse script primeiro builda `protocol` e `chat`.
3. Um teste só: `cd packages/<x> && pnpm exec vitest run --environment happy-dom <arquivo>` (se não houver build prévio de protocol/chat, rode antes `pnpm --filter @agentskit/chat-protocol build && pnpm --filter @agentskit/chat build`).
4. Scripts da raiz: `pnpm exec vitest run scripts/<arquivo>.test.mjs`.
5. `pnpm test:conformance` (rápido; roda no CI antes dos testes completos).

## 4. Verificação completa (`.github/workflows/ci.yml`)
- **quality** (o que mais reprova; ~longo): install → `pnpm lint` → `pnpm test:conformance` → `pnpm exec changeset status` (contra `main`) → `pnpm test` (testes + cobertura mínima por pacote, workspace-concurrency=1, lento) → `pnpm build` → `pnpm check:public-api` → `pnpm conformance:gate` → `pnpm bundle:budget` → índice doc-bridge determinístico (`pnpm docs:bridge:index` duas vezes, saída idêntica, sem entradas não rastreadas) → `docs:bridge:gate`, `docs:bridge:conformance`, `docs:bridge:doctor` → `vitest scripts/doc-bridge-index.test.mjs` → `ecosystem:claims:check` → `ecosystem:adoption:check` → `check:readme-standard` → `test:readme-standard` → `node scripts/release-gate.mjs` → `node scripts/pack-release.mjs`.
- **browser-e2e**: Playwright/Chromium, `pnpm build && pnpm test:e2e`. Lento; sujeito a instabilidade de browser.
- **ink-pty**: `pnpm build && pnpm test:pty && pnpm test:expo`. Lento (expo export).
- **runtime-contract**: Postgres 16 + `test:storage:pg:types`, `test:runtime:pg`, `test:migrations:pg`.
- Antes de terminar um ticket que toca API pública, docs ou README de pacote, rode os checks de `quality` correspondentes, não só o lint.

## 5. Regras que mais derrubam PR
- Changesets: mudança em pacote público exige `.changeset/<nome>.md`; o CI roda `changeset status`. Mudança só em docs/CI/scripts não precisa.
- `changelog.d/<ticket>.md` (raiz, primeira linha em conventional commit): fragmento de changelog; não edite o topo de `CHANGELOG.md` nem versões.
- API pública: alterou exports → `pnpm check:public-api:update` e commite o snapshot.
- Conformidade/catálogo: `pnpm conformance:report` regenera o relatório que `conformance:gate` confere.
- Orçamento de bundle (`bundle:budget`) e cobertura mínima por pacote (`vitest.coverage.ts`).
- TypeScript strict, sem `any`, só named exports. Novo contrato público exige ADR (AGENTS.md).
- Docs: `README.md` de pacote segue `readme-standard-v1.json` (`pnpm readme:standard:refresh`); docs novos entram no índice doc-bridge e devem passar `docs:bridge:gate`/`doctor`.
- Só arquivos rastreados pelo git entram no índice doc-bridge: faça `git add` antes de rodar `docs:bridge:index` para validar.
- Commits: conventional (`feat(react): ...`, `fix: ...`, `docs: ...`).

## 6. Arquivos de registro compartilhados
- `.changeset/` e `changelog.d/`: um arquivo novo por ticket, nome único (número do ticket/PR). Nunca edite arquivo de outro ticket.
- `pnpm-lock.yaml`: após merge de `main`, em conflito regenere com `pnpm install`, não resolva à mão.
- Gerados por script (`ecosystem-claims.json`, `ecosystem-adoption.json`, `readme-standard-v1.json`, snapshots de API pública, relatório de conformância): altere a fonte, rode o script gerador e commite o resultado; em conflito, regenere em vez de mesclar.
- `.cross-platform-baseline.json`: só acrescente entradas necessárias, uma por linha lógica.
- `docs/mvp.yaml` (quando existir): acrescente a evidência só do seu requisito.

## 7. Armadilhas conhecidas
- **`CI red: quality` (2×)**: o job `quality` agrega muitos gates. Causas típicas: falta de changeset, snapshot de API pública/conformância/ecosystem desatualizado, índice doc-bridge com arquivo não rastreado, README fora do padrão, cobertura abaixo do piso. Prevenção: rode os gates da seção 4 que o diff toca e use `pnpm lint` + `pnpm test:conformance` no mínimo.
- **`branch factory/agentskit-io-agentskit-chat-N is not on AgentsKit-io/agentskit-chat` (verify 1×, inspect 1×)**: a etapa não achou a branch no remoto (não foi enviada ou foi apagada após merge/fechamento). Não é falha de código. Prevenção: commite tudo na branch atual `factory/...`, não troque nem recrie a branch, não reescreva histórico; o push é da estação. Se o PR já foi mergeado e a branch apagada, a falha não se aplica mais.
- Testes `pg` falham sem o Postgres da seção 2; não os trate como regressão do seu diff.
- `pnpm test` completo é lento (concurrency 1): use filtro por pacote durante o trabalho.
