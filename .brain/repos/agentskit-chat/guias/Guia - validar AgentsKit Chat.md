---
tipo: guia
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "derivado de AGENTS.md, package.json e CONTRIBUTING.md; comandos não executados; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/overview.md", "docs/architecture/upstream-adoption.md"]
tags: [guia, repo/agentskit-chat, camada/ferramenta]
---

# Guia - validar AgentsKit Chat

> [!tldr] Em linguagem comum
> Use este roteiro antes de alterar um pacote para encontrar o dono, validar o comportamento e manter evidência de adoção upstream.

← [[00 Hub - agentskit-chat]]

## Quando usar

Antes de editar qualquer módulo, conforme a rota documental definida em `AGENTS.md:33-42`.

## Pré-requisitos

pnpm 10.33.0 (`package.json:7`, `packageManager`) e Node 22 (`.github/workflows/ci.yml:29`); dependências instaladas com `pnpm install --frozen-lockfile` (`ci.yml:31`). O `postinstall` roda `scripts/ensure-node-pty-helper.mjs` (`package.json:51`).

## Passos

1. Leia `AGENTS.md`, `docs/architecture/overview.md`, o handoff em `docs/for-agents/` e os ADRs relacionados.
2. Revise `docs/architecture/upstream-adoption.md` antes de criar qualquer primitivo local.
3. Consulte doc-bridge: `pnpm docs:bridge:index`; `pnpm docs:bridge:query ownership <id> --agent`; `pnpm docs:bridge:gate`; `pnpm docs:bridge:doctor`.
4. Execute os comandos específicos do pacote descritos na nota do módulo; para integração completa, use `pnpm lint`, `pnpm test`, `pnpm build`.
5. Para mudança pública, siga governança e ADR/RFC conforme `AGENTS.md:17`.

## Como validar

O comando `pnpm --filter <workspace> lint && pnpm --filter <workspace> test` é definido por pacote no `doc-bridge.config.json` (campo `checks`, ex.: `:116-119` para `@agentskit/chat`) e nos handoffs de `docs/for-agents/packages/`. Os nomes de filtro reais são `@agentskit/chat`, `@agentskit/chat-protocol`, `@agentskit/chat-server`, `@agentskit/chat-devtools`, `@agentskit/chat-cli`, `@agentskit/chat-react|vue|svelte|solid|angular|ink|react-native`, `@agentskit/chat-docs` e `@agentskit/chat-example-*` (campo `name` de cada `package.json`). Cada pacote define `lint` (`tsc --noEmit`; no Svelte, `svelte-check`) e `test` (vitest com cobertura); os `test` de vários pacotes compilam antes `@agentskit/chat-protocol` e `@agentskit/chat`.

Validação do repositório inteiro, na ordem em que o CI roda (`.github/workflows/ci.yml:17-71`): `pnpm lint`, `pnpm test:conformance`, `pnpm exec changeset status`, `pnpm test`, `pnpm build`, `pnpm check:public-api`, `pnpm conformance:gate`, `pnpm bundle:budget`, `pnpm docs:bridge:index`/`gate`/`conformance`/`doctor`, `pnpm ecosystem:claims:check`, `pnpm ecosystem:adoption:check`, `pnpm check:readme-standard`, `node scripts/release-gate.mjs`, `node scripts/pack-release.mjs`. Jobs separados: `browser-e2e` (`pnpm build` + `pnpm test:e2e`, `:73-100`) e `ink-pty` (`pnpm test:pty` + `pnpm test:expo`, `:102-118`). Mudanças de API pública exigem `pnpm check:public-api:update` e um changeset (`.changeset/`).

Esta auditoria não executou nenhum desses comandos (nem `pnpm` nem o CLI do doc-bridge); a existência de cada script foi conferida em `package.json:8-53` e nos `package.json` dos workspaces.

## Erros comuns

- Implementar mecanismo que já existe no AgentsKit.
- Passar dados de framework ao contrato compartilhado.
- Tratar saída de modelo como confiável sem schema/manifest.
- Omitir upstream adoption record do review.

## Notas relacionadas

[[00 Hub - agentskit-chat]], [[chat]], [[chat-protocol]], [[00 Decisões - agentskit-chat]].
