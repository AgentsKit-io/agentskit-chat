---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
substitui: [ADR-0028]
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0029-renderers-as-chat-subpaths.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat

> [!tldr] Em linguagem comum
> Os sete renderers também viram subcaminhos de `@agentskit/chat` (`/react`, `/vue`…); só a CLI continua como outro pacote público.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-14. Fonte: `docs/architecture/adrs/0029-renderers-as-chat-subpaths.md`.

## Decisão em linguagem comum

Os workspaces React, React Native, Ink, Vue, Svelte, Solid e Angular tornam-se módulos de implementação privados; seus artefatos de build nativos são montados dentro de `@agentskit/chat` e exportados em `/react`, `/react-native`, `/ink`, `/vue`, `/svelte`, `/solid` e `/angular`. Os runtimes de framework continuam peers opcionais do `@agentskit/chat`; importar a raiz ou outro subpath não carrega frameworks alheios. A CLI continua como único outro pacote público porque tem binário. Os nomes legados de renderer seguem publicados e suportados até uma fase de deprecação aprovada à parte (só metadados de orientação do npm; sem unpublish).

## Contexto e consequências

**Contexto.** A ADR-0028 manteve os sete renderers como produtos npm independentes por terem peers e formatos de build distintos; peers opcionais e exports por subpath permitem um só tarball sem carregar frameworks não usados, e manter sete identidades de release custa mais que o necessário.

**Consequências.**

- A superfície npm futura do Chat cai de nove para dois pacotes.
- Propriedade de código, compilação nativa, testes e orçamentos de bundle de cada renderer continuam isolados nos workspaces existentes.
- Consumidores instalam um pacote e escolhem o renderer por subpath.
- A verificação de release deve provar que cada artefato exportado existe no tarball combinado e exercitar um build clean-room de renderer.

## Pacotes afetados

Todos os renderers (privados): [[chat-react]], [[chat-react-native]], [[chat-ink]], [[chat-vue]], [[chat-svelte]], [[chat-solid]], [[chat-angular]]; [[chat]] (exports `packages/chat/package.json:45-78`); montagem em `scripts/assemble-chat-package.mjs:7-35`; [[chat-cli]] (único outro público).

## Substitui / substituído por

A decisão de publicação de renderers da [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]].

## Fonte

`docs/architecture/adrs/0029-renderers-as-chat-subpaths.md`.
