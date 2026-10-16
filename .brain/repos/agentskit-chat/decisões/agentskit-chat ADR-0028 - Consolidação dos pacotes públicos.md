---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
substituido-por: [ADR-0029]
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0028-public-package-consolidation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0028 - Consolidação dos pacotes públicos

> [!tldr] Em linguagem comum
> Protocolo, servidor e devtools deixam de ser pacotes npm separados e viram subcaminhos de um único pacote, `@agentskit/chat`.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted (parcialmente substituída pela ADR-0029). Data: 2026-07-14. Fonte: `docs/architecture/adrs/0028-public-package-consolidation.md`.

## Decisão em linguagem comum

`@agentskit/chat` passa a ser o único pacote público do comportamento compartilhado e publica de um só tarball os subpaths `@agentskit/chat/protocol`, `@agentskit/chat/protocol/fixtures`, `@agentskit/chat/server` e `@agentskit/chat/devtools`. Os workspaces `protocol`, `server` e `devtools` continuam como módulos internos com `private: true`; os pacotes de renderer dependem só de `@agentskit/chat`. A automação de release deve empacotar e verificar o artefato agregado e não publicar workspaces privados. Os nomes publicados antes recebem aviso de deprecação do npm apontando para o subpath correspondente apenas depois do gate HITL aprovado separadamente; versões existentes continuam publicadas (nenhum unpublish é autorizado).

## Contexto e consequências

**Contexto.** O Chat era implementado como 12 pacotes de workspace e publicava cada fronteira no npm; protocolo, servidor e devtools são módulos de implementação da camada de aplicação, não produtos com política de compatibilidade independente, e publicá-los à parte só soma overhead de release, proveniência, documentação e grafo de dependências. Os renderers ficaram separados por terem runtimes e peers distintos; a CLI, por ter binário.

**Consequências.**

- A superfície npm inicial caiu de 12 para 9 pacotes (a ADR-0029 depois consolidou os renderers).
- Propriedade interna e testes focados permanecem.
- Módulos compartilhados usam uma linha de semver e um artefato de proveniência.
- Consumidores migram imports, sem mudança de comportamento.

## Pacotes afetados

[[chat]] (subpaths em `packages/chat/package.json:25-44`), [[chat-protocol]], [[chat-server]], [[chat-devtools]] (todos `private`). Scripts de release: `scripts/pack-release.mjs`, `scripts/verify-release-artifacts.mjs`; deprecação: `scripts/legacy-package-deprecation-lib.mjs`.

## Substitui / substituído por

Parcialmente pela [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]] (a decisão de publicar os renderers como pacotes próprios).

## Fonte

`docs/architecture/adrs/0028-public-package-consolidation.md`.
