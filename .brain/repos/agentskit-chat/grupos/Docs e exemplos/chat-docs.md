---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["apps/docs/lib/chat-definition.ts", "apps/docs/package.json", "apps/docs/tests/dogfood.test.ts", "docs/for-agents/apps/docs.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-docs

> [!tldr] Em linguagem comum
> Portal Fumadocs e host de demonstração React; compila o corpus canônico `docs/` e compõe Ask/search/artefatos determinísticos.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Portal Fumadocs e host de demonstração React; compila o corpus canônico `docs/` e compõe Ask/search/artefatos determinísticos. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `docsChatDefinition` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/docs/lib/chat-definition.ts:23` |

Exemplo real (`apps/docs/lib/chat-definition.ts:23`):

```tsx
export const docsChatDefinition = defineChat({
  id: 'agentskit-chat-docs',
  revision: 1,
  components: defineComponentManifest(StandardComponentCatalog),
  chat: { adapter, memory },
  choiceSubmission: adapter.resolveChoiceSubmission,
})
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Nenhum workspace depende dele; é o site publicado (deploy Cloudflare via `cf:*`, `apps/docs/package.json:11-13`) |
| Dependências | [[chat]] (`workspace:*`, `apps/docs/package.json:20`; o `tsconfig` mapeia também `@agentskit/chat-server` para a fonte, `apps/docs/tsconfig.json:24`); [[00 Hub - agentskit]]: `@agentskit/core`, `@agentskit/react`; Fumadocs, Next 15, Mermaid. **Não** importa [[chat-example-shared]] |

## Dados e efeitos

Lê o corpus `docs/` e gera o índice em `prebuild` (`apps/docs/scripts/build-docs-index.mjs`, saída tipada em `apps/docs/lib/docs-index-generated.d.ts`). Expõe rotas HTTP em `apps/docs/app/` (`api/ask`, `api/demo-ask`, `api/search`, `llms.txt`, `llms-full.txt`, `deterministic/knowledge.json`, `deterministic/site-config.json`, `raw/[...path]`). Não grava dados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/docs/lib/chat-definition.ts`.
- **Invariantes:** Não duplicar corpus, busca semântica ou memória. `POST /api/ask` hoje responde sempre 503 `ASK_INTERNAL` ("backend não configurado"): a rota só chama `unavailableAskResponse()` (`apps/docs/app/api/ask/route.ts:7`, `apps/docs/lib/ask-handler.ts:13-15`); `/api/demo-ask` e `/api/search` são rotas separadas em `apps/docs/app/api/`.
- **Testes:** `apps/docs/tests/dogfood.test.ts`, `apps/docs/tests/frontmatter.test.ts`, `apps/docs/lib/observability-demo.test.ts` (vitest, `test` = `vitest run`); e2e e acessibilidade em `apps/docs/tests/e2e/docs.spec.ts` (`pnpm --filter @agentskit/chat-docs test:e2e`, projeto `docs` do `playwright.config.ts:37`).
- **Validação:** `pnpm --filter @agentskit/chat-docs lint && pnpm --filter @agentskit/chat-docs test && pnpm --filter @agentskit/chat-docs build` (`apps/docs/package.json:9,15-17`; o `build` roda `prebuild` — `scripts/build-docs-index.mjs` — e `check-build-budget.mjs`). O gate documental é `pnpm docs:bridge:gate` (`doc-bridge.config.json:98-110`).
- **Armadilhas:** o corpus vem de `docs/` na raiz (não de `apps/docs`); `postinstall` roda `fumadocs-mdx`; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:19`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0027 - Site Fumadocs como host de dogfood de primeira classe]], [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/docs`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/docs/lib/chat-definition.ts:23` — ponto de entrada citado; `apps/docs/package.json:1` — dependências e scripts; `docs/for-agents/apps/docs.md:1` — handoff do app; `apps/docs/tests/dogfood.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
