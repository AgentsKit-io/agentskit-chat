---
tipo: global
repo: agentskit-chat
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "auditoria v2 por leitura do código e dos package.json/workflows + scripts locais de conferência de referências, símbolos e links; nenhum teste, build ou pnpm foi executado; auditado em 2026-10-16"
fontes: ["AGENTS.md", "package.json", "doc-bridge.config.json", ".github/workflows/ci.yml", "pnpm-workspace.yaml", "docs/architecture/adrs/"]
tags: [global, repo/agentskit-chat]
---

# Auditoria - agentskit-chat

← [[00 Hub - agentskit-chat]]

## Auditoria v2 — 2026-10-16

Auditor: agente de auditoria (não é o autor das notas). Base: HEAD `d8aa3a5` (o código do repositório é o de `8aeeffd`; o commit `d8aa3a5` só acrescenta `.brain/`). As notas anteriores citavam `f0840fb`; todas passaram a citar `d8aa3a5`.

### Escopo e números

| Item | Resultado |
|---|---|
| Notas auditadas | 66 (hub, índice de decisões, guia, 2 fluxos, 3 hubs de grupo, 4 pacotes do núcleo, 8 interfaces, 8 docs/exemplos, 38 ADRs) |
| Referências `arquivo:linha` conferidas | 281 citações originais (script que abre cada arquivo e confere existência e limite de linhas; as linhas relevantes foram lidas uma a uma) — 0 arquivos ausentes, 0 linhas além do fim do arquivo |
| Referências erradas/imprecisas corrigidas | 11 distintas (12 ocorrências) + 12 notas com `AGENTS.md:1` vago trocado por faixas de linhas reais |
| Referências hoje no vault | 409 (incluindo as deste relatório), todas resolvem (script local em `node`; 0 ausentes, 0 além do fim do arquivo) |
| Símbolos de tabelas "API e contratos" | 43 linhas conferidas contra o arquivo/linha citado — 0 ausentes |
| Links `[[...]]` | todos resolvem dentro de `repos/agentskit-chat/`, exceto 13 links para notas de outras partes do vault (hubs globais e pacotes do framework), não verificáveis a partir deste repositório |
| Comandos de validação | todos os `pnpm --filter ... lint/test/build`, `pnpm test:pty`, `pnpm test:e2e --project=...`, `pnpm test:expo`, `pnpm test:storage:pg`, `pnpm docs:bridge:*` existem em `package.json` (raiz ou do workspace) ou em `doc-bridge.config.json`; nenhum foi executado |
| Cobertura | 20/20 workspaces (`pnpm-workspace.yaml`: `packages/*` = 12, `apps/*` = 8) têm nota; 38/38 arquivos `docs/architecture/adrs/NNNN-*.md` têm nota de ADR |

### Referências erradas corrigidas (exemplos com evidência)

| Nota | Antes | Depois | Evidência |
|---|---|---|---|
| chat-vue | `StandardComponent` em `packages/vue/src/index.ts:7` (linha de `import ... from 'vue'`) | `:10` (reexport de `./StandardComponent.js`) | `export { StandardComponent, type StandardComponentProps } from './StandardComponent.js'` |
| chat-solid | `StandardComponent` em `packages/solid/src/index.tsx:103` (linha com `}`) | `:10` (reexport) | mesma forma de reexport na linha 10 |
| AgentsChat - Sessão e retomada | `index.ts:766` "salvamento e SessionConflictError" (linha do `buildSnapshot`) | `:765-767` (+ `:599` classe) | linha 767: `... save(snapshot, expectedCursor, ...))) throw new SessionConflictError()` |
| chat-example-react | ponto de entrada `apps/example-react/src/App.tsx:2` (import de `example-shared`) | `:1` (import do `AgentChat`) | linha 1: `import { AgentChat } from '@agentskit/chat/react'` |
| chat-example-solid / -svelte / -vue | detalhe técnico em `App.tsx:3`, `App.svelte:5`, `App.vue:5` (itens de import) | `:37`, `:45`, `:59` (primeiro `<AgentChat>`, igual à tabela) | `<AgentChat definition={ragChat} ...` nessas linhas |
| chat-react-native | detalhe `packages/react-native/src/index.tsx:1` "declara o shell" | `:256` | `export const AgentChatNative = (props: AgentChatNativeProps): ReactElement => (` |
| chat-server | exemplo `packages/server/fixtures/readme-example.ts:13` (2 ocorrências) | `:1-16` (o arquivo todo) | arquivo tem 16 linhas; linha 13 é só `authenticate: options.authenticate,` |
| chat | exemplo `packages/chat/fixtures/readme-example.ts:4` | `:1-7` | arquivo tem 7 linhas; o bloco citado começa nos imports |
| chat-example-vue | fonte/teste `tests/e2e/chat-conformance.ts` (helper) | `tests/e2e/vue-support.spec.ts` | `playwright.config.ts:36` (`testMatch: /vue-support/`) |
| chat-example-ink | símbolo "`render(controlled`" (expressão truncada) | `render(...)` + `AK_EXAMPLE` (`index.tsx:7-10`, `:11`) | `const controlled = process.env.AK_EXAMPLE === 'controlled'` |

Verificação por `sed -n` (equivalente local, pois `sed` não está disponível neste ambiente) no relatório do commit.

### Afirmações corrigidas

| Nota | O que estava errado | O que é certo | Evidência |
|---|---|---|---|
| chat-cli | Dizia "apresenta a conversa AgentsKit em CLI Node" e que depende de `[[agentskit-cli]]`; armadilha copiada dos renderers | É uma ferramenta de scaffolding (`init`, `add component`, `completion`), binário `agentskit-chat`; depende de `@agentskit/chat`, `@agentskit/cross-platform` e Zod | `packages/cli/src/bin.ts:8-13`, `packages/cli/package.json:16-18,37-41`, `packages/cli/src/index.ts:3-4` |
| chat | `chat-protocol` listado como consumidor do `chat` (sentido invertido); faltavam statechart/memory | `chat` importa `@agentskit/chat-protocol`; consumidores reais: server, devtools, cli, renderers, exemplos | `packages/chat/src/index.ts:3,20`, `packages/server/src/index.ts:5`, `packages/devtools/src/index.ts:2`, `packages/cli/src/index.ts:4` |
| chat-server | `chat` e `chat-protocol` como "consumidores" | São dependências (`workspace:*`); ninguém depende do server; é `private` e publicado como `@agentskit/chat/server` | `packages/server/package.json:3,35-40`, `packages/chat/package.json:35` |
| chat-protocol | consumidores "renderers via fixtures" sem evidência | Consumidores com import: `chat` e `chat-server`; não importa nenhum pacote do repo | `packages/chat/src/index.ts:20`, `packages/server/src/index.ts:7`, `packages/protocol/src/index.ts:1-3` |
| chat-devtools | `chat` como consumidor | `chat` é dependência (só tipos); `@agentskit/eval/replay` é a dependência upstream | `packages/devtools/package.json:36-37`, `packages/devtools/src/index.ts:1-2` |
| 7 renderers (react, vue, svelte, solid, angular, ink, react-native) | "Consumidores: consumidores de exemplo…" genérico; nada dizia que o workspace é `private` e vira subpath | Workspace privado; `scripts/assemble-chat-package.mjs` copia o `dist` para `packages/chat/dist/renderers/<r>`; apps e CLI importam `@agentskit/chat/<r>` | `scripts/assemble-chat-package.mjs:7-25`, `packages/chat/package.json:45-78`, `apps/example-*/src/*` |
| 5 renderers (vue, solid, svelte, angular, react-native) | Invariante "em modo controlado não chamar hook…" aplicado a todos | O modo controlado existe só em React e Ink | `git grep -i controlled packages/{vue,solid,svelte,angular,react-native}/src` sem resultado; ocorrências só em `packages/react/src/index.tsx` e `packages/ink/src/index.tsx` |
| 7 apps de exemplo | `[[chat-react]]`/`[[chat-example-shared]]` como "consumidores"; "dados e efeitos" copiado do docs ("host de docs pode expor HTTP") | Dependem de `@agentskit/chat` (subpath) e de `chat-example-shared`; nenhum depende do workspace do renderer; sem HTTP próprio | `apps/example-react/package.json:11-18`, `apps/example-react/src/App.tsx:1-2` |
| chat-example-shared | consumidores "renderers" | Os seis apps de exemplo (react, vue, svelte, solid, react-native, ink) | `apps/example-react/package.json:13` (e o mesmo `:13` nos outros cinco `package.json` de exemplo) |
| chat-docs | consumidor `chat-example-shared`; "`/api/ask` fecha sem backend explicitamente configurado" | Docs **não** depende de `example-shared`; a rota `POST /api/ask` devolve sempre 503 `ASK_INTERNAL` | `apps/docs/package.json:19-33`, `apps/docs/app/api/ask/route.ts:7`, `apps/docs/lib/ask-handler.ts:13-15` |
| chat-example-react-native / solid / svelte / vue | "Testes" apontavam para `example-shared/tests/support.test.ts` ou para um helper | Não há `test` próprio; e2e existe só para react, react-native, vue (+docs) | `playwright.config.ts:33-38`, `tests/e2e/*.spec.ts` |
| Guia - validar | Só citava `pnpm --filter <workspace>`; "Node e pnpm 10 em `package.json:1`" (linha 1 é `{`) | Ordem real do CI, nomes reais dos filtros, pnpm 10.33.0 (`package.json:7`) e Node 22 | `.github/workflows/ci.yml:17-118`, `package.json:7,8-53` |
| Hub | Só dizia que o CLI não rodou | Acrescentados jobs do CI, estrutura publicada (`@agentskit/chat` + subpaths; CLI) | `ci.yml:17,73,102`, `packages/chat/package.json:19-83` |
| ADR-0037 | `status: aceito`, "status não extraído" | Fonte: **Proposed**, 2026-10-09; `status: proposto` | `docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md:3` |
| ADR-0027, 0033, 0034, 0036 | "status não extraído; consultar fonte" | 0027 aceita (HITL 2026-07-16); 0033 aceita (2026-07-16); 0034 aceita para implementação (2026-09-04); 0036 aceita para implementação (2026-10-06, revisão do pai pendente) | linhas 3-5 dos respectivos ADRs |
| ADR-0028 / 0029 | Sem relação de substituição | 0028 "partially superseded by" 0029; 0029 "supersedes the renderer-publication decision in 0028" (frontmatter `substituido-por`/`substitui`) | `docs/architecture/adrs/0028-public-package-consolidation.md:5`, `0029-...md:5` |
| ADR-0035 | Descrevia 501 sem dizer que a ADR-0038 o restringiu | Com política de upload o servidor aceita partes; 501 só sem política | `packages/server/src/index.ts:128` |
| 38 ADRs | Corpo genérico ("O texto-fonte define o limite…"), sem decisão, contexto, consequências nem pacotes | Reescritos a partir da fonte: decisão, contexto/alternativas, consequências, pacotes afetados com `arquivo:linha`, relações entre ADRs, datas | cada nota cita `docs/architecture/adrs/NNNN-*.md` |
| Decisões (índice) | Sem organização por tema nem estado | Tabela por tema (38/38 ADRs), propostas e substituições | `docs/architecture/adrs/` |
| AgentsChat - Sessão e retomada | Retomada descrita só como "erro explícito" | Sem snapshot salvo cria sessão nova; snapshot inválido ou de outra sessão/definição/revisão falha | `packages/chat/src/index.ts:961-971` |
| Hubs de grupo | `AGENTS.md:1` (só o título) e tag `grupo/...` duplicada | Faixas reais de `AGENTS.md` (`:11`, `:12`, `:9-20`, `:19`, `:17`, `:33-42`); tags deduplicadas | `AGENTS.md:9-42` |

### Afirmações removidas por não serem sustentáveis

- chat-cli: dependência em `[[agentskit-cli]]` (não consta no `package.json`) e a armadilha "não deixar o binding upstream e o shell divergirem" (não se aplica à CLI).
- chat-docs, chat-example-*: "consumidores" que eram dependências ou inexistentes; parágrafo "dados e efeitos" copiado entre apps (o docs expõe HTTP; os exemplos não).
- ADR-0001…0038: a frase "a associação por pacote deve ser lida com os handoffs… e não inferida" foi substituída por associações com evidência de código.

### Itens não verificáveis a partir deste repositório

> [!question] Dúvida
> Links para `[[00 Hub - agentskit]]`, `[[00 Hub - doc-bridge]]`, `[[00 Hub - agentskit-registry]]`, `[[00 Hub - agents-playbook]]`, `[[00 Hub - Ecossistema AgentsKit]]`, `[[agentskit-ask-backend]]` e `[[agentskit-react|vue|svelte|solid|angular|ink|react-native]]` apontam para notas de outras partes do vault; a existência e o conteúdo delas não foram conferidos aqui. A relação "agentskit-registry/agents-playbook como consumidores/fonte de exemplos" do Hub vem de `doc-bridge.config.json:465-488` (federação de `llms.txt`), não de dependências de código.

> [!question] Dúvida
> O texto-fonte da ADR-0032 tem frases truncadas em Context, Decision e Alternatives (`docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md:17,31-32,52-53`); a nota segue só o trecho legível. Sugere-se corrigir o ADR de origem.

> [!question] Dúvida
> `.github/CODEOWNERS` não existe (`git ls-files .github`); o "revisor" continua indefinido em todas as notas de pacote.

### Lacunas de cobertura

- **Pacotes/apps/ADRs:** nenhuma lacuna (20/20 e 38/38).
- **Fluxos ausentes** (só existem "Resposta local e escalada" e "Sessão e retomada"): (1) turno HTTP completo — `createChatHandler`: autenticação, lease, cursor, NDJSON (`packages/server/src/index.ts:96-310`); (2) decisão de ação e política de custo (ADR-0037); (3) partes referenciadas e upload (ADR-0035/0038); (4) scaffolding da CLI (`init`/`add component`); (5) release e conformância (`ci.yml`, `release-gate`, `pack-release`, `conformance-gate`, preflight de deprecação); (6) adoção do ecossistema (`ecosystem-adoption.json`).
- **Sem nota própria** (não são workspaces): `scripts/` (gates de release/conformância/adoção), `conformance/`, `release/`, `tests/storage-pg/`, `tests/e2e/`. Hoje só aparecem citados nas ADRs 0025, 0030, 0032, 0033, 0036 e no Guia.
- **Conceitos** (convenção v2): não há notas de conceito (ex.: snapshot de turno, envelope de sessão, lease de turno, manifesto de componentes).
- Nenhum pacote ou app ficou sem nota; por isso nenhuma nota de pacote nova foi criada.

### Veredito de confiança por nota

| Nota(s) | Confiança | Motivo |
|---|---|---|
| [[00 Hub - agentskit-chat]] | média | Estrutura e CI conferidos; relações do ecossistema vêm de fora do repo |
| [[00 Decisões - agentskit-chat]] | alta | 38/38 ADRs conferidos contra os arquivos-fonte |
| [[Guia - validar AgentsKit Chat]] | alta | Comandos e jobs conferidos em `package.json` e `ci.yml`; nada executado |
| [[AgentsChat - Resposta local e escalada]] | alta | Linhas lidas em `deterministic.ts` e `ask-service.ts` |
| [[AgentsChat - Sessão e retomada]] | alta | Linhas lidas em `index.ts` (chat e server) |
| [[chat]] | alta | Símbolos, dependências e scripts conferidos |
| [[chat-protocol]] | alta | Símbolos, dependências e scripts conferidos |
| [[chat-server]] | alta | Ordem do handler e dependências conferidas |
| [[chat-devtools]] | alta | Símbolos, redação e dependências conferidos |
| [[chat-cli]] | alta | Reescrita contra `index.ts`, `bin.ts`, `package.json` |
| [[chat-react]], [[chat-ink]] | média | API e dependências conferidas; comportamento interno de UI não lido a fundo |
| [[chat-vue]], [[chat-solid]], [[chat-svelte]], [[chat-angular]], [[chat-react-native]] | média | idem; "armadilhas"/invariantes genéricos mantidos do texto original |
| [[chat-docs]] | média | Rotas, scripts e `/api/ask` conferidos; demos e componentes não lidos a fundo |
| [[chat-example-shared]] | média | Dependências e consumidores conferidos; domínios (suporte/RAG/operações) não lidos a fundo |
| [[chat-example-react]], [[chat-example-vue]], [[chat-example-svelte]], [[chat-example-solid]], [[chat-example-react-native]], [[chat-example-ink]] | alta | Pontos de entrada, dependências, scripts e e2e conferidos |
| Hubs de grupo (3) | alta | Conteúdo mínimo e conferido |
| ADR-0001 a 0031, 0033, 0034, 0036 | alta | Transcrição fiel da fonte, com referências de código conferidas |
| ADR-0032 | média | Fonte com trechos truncados |
| ADR-0035, 0037, 0038 | alta | Propostas na fonte; implementação parcial confere com `packages/server/src/index.ts` e `uploads.ts` |
