# Trilha 04 — validação de continuidade

## Contrato aprovado

Intent: implementar e validar a lib para Expenses → Receitas, preparar PRs;
sem merge, publicação ou alterações em produtos/upstream. Task task_7d288854e749,
dispatch ctx_d019b7619487. Baseline d980ce2; quatro arquivos herdados foram
preservados, incluindo overrides locais que serão removidos antes do commit.

Critérios e evidência exigida: C1 parts por referência chegam ao adapter com string
compatível, fronteira 64 KiB, isolamento e checksum (suíte server + S3 real local +
workerd); C2 decisão entre requests com restart/replay e claim sem duplicata
(suítes server/protocol e contrato Postgres Node/workerd); C3 SessionStorage e
ChatMemory Drizzle/Postgres (contratos reais e inspeção de export upstream);
C4 CostStore durável, cota e ledger (contrato upstream + fluxo do handler);
C5 adapter compatível baseUrl/headers/OpenRouter (captura HTTP upstream);
C6 lint/typecheck/test/conformance/docs/API/changeset (comandos do repo);
C7 PRs com evidência, versões/ordem e cleanup (diff/status, links e revisão).

Budget: dependências/containers locais existentes, um worker de teste, sem CI ou
conta externa, credenciais reais ou fixture de produto. Recursos da máquina são
checados antes das suítes; não remover containers/processos herdados ou alheios.
UI não é tocada, portanto revisão visual não aplicável. Revisão independente do
coordenador permanece pendente e não equivale à aprovação deste worker.

## Limites conhecidos

Em 2026-10-10 npm retorna core 1.14.1 e observability 0.12.1. O ambiente herdado
usa tarballs locais; os resultados nesse ambiente são provisórios, não validação
de instalação publicada. Overrides e lockfile local não entram no PR.
MinIO: Docker Hub negou pull (access denied); quay.io retornou 401 para a imagem
RELEASE.2025-09-07T16-13-09Z. SeaweedFS não substitui o gate MinIO/R2 do PRD.
Neon, R2, Hyperdrive, OpenRouter real e confronto de ledger com fatura do provedor
exigem ambiente externo não configurado neste dispatch.

## Evidência local atual

Fonte upstream inspecionada/testada: `fdb1e758d84dcb05e6a746f37b400803565d8dab`.
Ambiente herdado: core/observability instalados via tarball, cujos nomes/versões
metadata ainda dizem 1.14.1/0.12.1; contêm APIs de releases pendentes. Isso não
altera os pisos declarados nem prova instalação por registry. Não foi copiado
source upstream; contratos upstream foram executados no próprio checkout.

| Critério | Resultado provisório e limite |
|---|---|
| C1 / RF-07–11 | Server 65/65 com S3 SeaweedFS real em localhost: PUT/GET, checksum, isolamento, strings, URLs e bytes entregues ao adapter; assinatura inválida recebe 403. Workerd adapter busca a URL e retorna os bytes como texto, NDJSON não contém assinatura. Server linhas 98,84%, index 100%, uploads 99,06%. MinIO/R2 bloqueados. |
| C2 / RF-17–24 | Server/protocol e contrato Postgres Node 2/2; workerd devolve 8 critérios. 100 races de 8 claims com um vencedor; 100 rounds de 4 approves via handlers novos com uma execução e um resume. As escritas de domínio do fixture são contadas em array, não em tabela real de produto. |
| C3 / RF-12–16 | SessionStorage: 100 CAS races, tenant isolation, lease 200/409, conflito SQL e recuperação em Node/workerd. ChatMemory upstream: contrato CM1–CM6 em Postgres 16 Node/workerd, isolamento, parts, retenção e recovery. Neon/Hyperdrive não validados. |
| C4 / RF-25–29 | CostStore upstream: Node/workerd, concorrência no teto, ledger, release, replay race, expiry. Handler testa 402/aviso por cap fornecido pelo host. Entitlements real e comparação de fatura não analisados. |
| C5 / RF-01/02/04/05 | Upstream `multimodal-http.test.ts`: 21/21 via servidor loopback, baseUrl/path/headers/fetch livres, presets e serialização de parts. Nenhuma chamada a provedor real. |
| C6 | `pnpm test` completo, `test:conformance` 5/5, `test:storage:pg:types`, `check:public-api` após snapshot dos dois exports novos passam. Lint inicial falhou só ao varrer Expo/Wrangler gerados; caminhos excluídos do scan, mantendo os 15 baselined. Gates finais abaixo. |
| C7 | ADR Proposed, changeset minor, guia Hono e PR stacked; revisão independente pendente. Nenhum merge/publicação. |

Comandos de aceitação (Node 25 para suítes iniciais, Node 22 para quality final):

```sh
VITEST_MAX_WORKERS=1 CHD_S3_ENDPOINT=http://127.0.0.1:59000 CHD_WRANGLER_URL=http://127.0.0.1:18789 pnpm --filter @agentskit/chat-server test
VITEST_MAX_WORKERS=1 CHD_S3_ENDPOINT=http://127.0.0.1:59000 CHD_WRANGLER_URL=http://127.0.0.1:18789 pnpm test
pnpm test:storage:pg:types
pnpm test:storage:pg
pnpm exec wrangler dev --config tests/storage-pg/wrangler.jsonc --local --port 8788
curl --fail http://127.0.0.1:8788/
pnpm test:conformance
pnpm check:public-api
```

No checkout upstream, sem alterar source, respectivamente em memory/observability:
`AK_POSTGRES_TEST_PORT=56439 pnpm exec vitest run tests/postgres.integration.test.ts --maxWorkers=1`
e `AK_POSTGRES_TEST_PORT=56439 node tests/postgres-workerd.mjs`.
Em adapters: `pnpm exec vitest run tests/multimodal-http.test.ts --maxWorkers=1`.
Fixture Postgres herdada é 16.15; nenhum container herdado foi removido.

## Quality final e reconciliação

Node 22.22.2: lint/typecheck recursivo, build completo, conformance:gate,
bundle:budget, ecosystem:claims:check, ecosystem:adoption:check,
docs:bridge:conformance, release-gate e pack-release passaram. README standard
teve falha inicial pela nova contagem de ADR e hash; count 38 + hashes afetados
corrigidos preservando datas, check final e 7/7 testes passam. Browser E2E **52/52**,
PTY **10/10**, Expo export web/iOS passam. São os flows automatizados existentes;
não são certificação de toda acessibilidade, latência ou aprovação visual.

Validated (local/provisório): C1 entrega em SeaweedFS/workerd; C2 claims SQL e
comportamento handler; C3 persistência local; C4 custo local; C5 captura HTTP;
C6 comandos acima. Partially validated: C1 MinIO/R2, C2 domínio de produto e
C3/C4 Neon, C5 provedor real, C6 instalação publicada. Blocked: dependências
upstream não publicadas e lockfile de registry, MinIO pull, gates externos do PRD.
Not analyzed: entitlements/serviço de domínio reais, fatura do provedor,
receipts reais, QA de produto, RLS aplicada e prontidão produção. Not applicable:
merge/publicação/deploy e aprovação visual (nenhuma UI implementada).
C7 awaiting independent coordinator review: não se declara o objetivo completo.

Ordens para o coordenador, sem execução por este worker:
1. Revisar/mergear agentskit#1835 (CostStore), então atualizar/revisar o
   "Version Packages" agentskit#1757; só publicar com autorização do dono.
2. Publicar core 1.15.0, adapters 0.19.0, memory 0.12.0, observability 0.13.0.
3. Regenerar lockfile de registry no chat e repetir gates: chat#205 primeiro,
   depois o PR de parts empilhado; revisar ADRs/evidência e gates externos.
4. Revisar "Version Packages" do chat depois dos dois PRs. Changesets juntos:
   pacotes públicos chat e chat-cli 0.6.0 (fixed group). Se parts entrar numa
   release posterior à 0.6, recalcular; minor proposto será 0.7.0.
5. AKOS#6392/matriz acompanha a release; Expenses valida a versão fixada,
   Receitas consome a mesma. Não liberar IA paga sem gates Neon/R2/provedor.

Cleanup: overrides/lockfile locais removidos antes de commit, preservados somente
no temporário de validação. Processos Wrangler deste run e temporários serão
removidos após registrar evidência; containers/tarballs/caches herdados preservados.
Artefatos dist/Expo/pack são caches ignorados do repo, não source publicado.

Evidência atual vinculada por SHA-256:
[manifesto](./evidence/trilha-04-2026-10-10.json). Código de produção permanece
`d980ce2`; fixtures/docs/API/config mudaram nesta continuação e estão no manifesto.
Instalação frozen offline após remover overrides retorna `ERR_PNPM_OUTDATED_LOCKFILE`
(core ^1.12.3 no lock contra ^1.15.0 no manifest; observability ^0.13 adicionado).
Docs index/gate/doctor e index tests 3/3 passam; doctor mantém 40/62 áreas sem
documentação, 54/178 documentos sem edge para código e benchmark ausente.
Isso não é evidência de documentação semântica completa.
