---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0033 - Preflight de descontinuação ao vivo e fail-closed

> [!tldr] Em linguagem comum
> Antes de marcar os pacotes npm antigos como descontinuados, um teste ao vivo e que falha por padrão confere se tudo continua como foi revisado; qualquer divergência bloqueia a operação.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted — 2026-07-16. Data: 2026-07-16. Fonte: `docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md`.

## Decisão em linguagem comum

O plano de deprecação dos pacotes legados usa o schema v2: cada pacote registra o dist-tag `expectedLatest` e o conjunto completo `expectedVersions` auditados. Imediatamente antes do HITL, um preflight ao vivo, somente leitura, também deve: rodar a avaliação determinística de prontidão dos consumidores; resolver cada execução do GitHub Actions declarada pela API pública, vinculá-la ao repositório declarado e exigir `completed/success`; exigir que as URLs públicas de produção e migração respondam com sucesso; exigir cada versão consolidada evidenciada no npm e cada export de substituição; e exigir que cada packument legado bata com o dist-tag e o conjunto de versões revisados e não tenha aviso de deprecação. Qualquer divergência bloqueia toda a operação; o preflight nunca altera o npm.

## Contexto e consequências

**Contexto.** O livro-razão determinístico prova intenção do repositório, mas não detecta que uma execução de CI referenciada depois falhou, que uma URL de evidência sumiu ou que uma nova versão legada foi publicada após a revisão; `npm deprecate @*` afetaria essa nova versão, então um snapshot obsoleto é inseguro.

**Consequências.**

- Publicar qualquer versão legada invalida a aprovação e exige atualização revisada do plano.
- Uma página HTML de CI acessível não conta como evidência de CI passando.
- O HITL continua obrigatório depois que os gates determinístico e ao vivo reportam prontidão.

## Pacotes afetados

Repositório: `release/legacy-package-deprecations.json`, `scripts/legacy-package-deprecation-preflight.mjs`, `scripts/legacy-package-deprecation-preflight-lib.mjs`, `scripts/legacy-package-deprecation-plan.mjs`, `scripts/legacy-package-deprecation-lib.mjs` e os testes `scripts/legacy-package-deprecation*.test.mjs` (`pnpm release:deprecation:preflight`, `pnpm test:release-deprecation` — `package.json:47-49`).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0033-live-fail-closed-legacy-deprecation-preflight.md`.
