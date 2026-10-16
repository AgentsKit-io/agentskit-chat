---
tipo: guia
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "derivado de AGENTS.md, package.json e CONTRIBUTING.md; comandos não executados"
fontes: ["docs/architecture/overview.md", "docs/architecture/upstream-adoption.md"]
tags: [guia, repo/agentskit-chat]
---

# Guia - validar AgentsKit Chat

> [!tldr] Em linguagem comum
> Use este roteiro antes de alterar um pacote para encontrar o dono, validar o comportamento e manter evidência de adoção upstream.

← [[00 Hub - agentskit-chat]]

## Quando usar

Antes de editar qualquer módulo, conforme a rota documental definida em `AGENTS.md:1`.

## Pré-requisitos

Node e pnpm 10 declarados em `package.json:1`; dependências instaladas com `pnpm install`.

## Passos

1. Leia `AGENTS.md`, `docs/architecture/overview.md`, o handoff em `docs/for-agents/` e os ADRs relacionados.
2. Revise `docs/architecture/upstream-adoption.md` antes de criar qualquer primitivo local.
3. Consulte doc-bridge: `pnpm docs:bridge:index`; `pnpm docs:bridge:query ownership <id> --agent`; `pnpm docs:bridge:gate`; `pnpm docs:bridge:doctor`.
4. Execute os comandos específicos do pacote descritos na nota do módulo; para integração completa, use `pnpm lint`, `pnpm test`, `pnpm build`.
5. Para mudança pública, siga governança e ADR/RFC conforme `AGENTS.md:1`.

## Como validar

O comando `pnpm --filter <workspace> lint && pnpm --filter <workspace> test` é definido nos handoffs por pacote. Neste ambiente, pnpm não está instalado e os comandos não foram executados.

## Erros comuns

- Implementar mecanismo que já existe no AgentsKit.
- Passar dados de framework ao contrato compartilhado.
- Tratar saída de modelo como confiável sem schema/manifest.
- Omitir upstream adoption record do review.

## Notas relacionadas

[[00 Hub - agentskit-chat]], [[chat]], [[chat-protocol]], [[00 Decisões - agentskit-chat]].
