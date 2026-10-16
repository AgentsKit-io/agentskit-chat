---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0020-public-alpha-dogfood-channel.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0020 - Artefatos alfa públicos para dogfood externo

> [!tldr] Em linguagem comum
> Antes da publicação estável no npm, o Chat solta uma versão alfa imutável no GitHub para que Docs, Registry e Playbook possam testá-lo de fora do repositório.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0020-public-alpha-dogfood-channel.md`.

## Decisão em linguagem comum

Publica `v0.1.0-alpha.0` como prerelease imutável do GitHub com tarballs compatíveis com npm para o grafo mínimo de dogfood web: `@agentskit/chat-protocol`, `@agentskit/chat`, `@agentskit/chat-react` e `@agentskit/chat-server`, todos com a mesma versão prerelease (pnpm reescreve as arestas `workspace:*` no pack). Consumidores externos declaram as URLs dos assets e sobrescrevem as arestas internas de semver. O workflow rejeita tag cujo commit não esteja em `main`; os assets saem desse commit revisado, com checksums SHA-256, e um import ESM/CJS e um build Vite de produção "clean-room" provam que nenhum caminho de workspace é necessário; Immutable Releases do GitHub é habilitado. O canal vale só para compatibilidade de dogfood; a matriz completa de renderers, proveniência npm, política de compatibilidade estável e tags estáveis continuam na issue #30.

## Contexto e consequências

**Contexto.** As migrações de dogfood de Docs, Registry e Playbook rodam em repositórios fora do Chat; a ADR-0002 proíbe imports privados e caminhos de workspace não publicados; a publicação estável do v0 depende de dogfood e conformidade (#30) e o repositório ainda não tinha credencial de publicação npm. Rejeitados: importar fonte entre repositórios, antecipar a #30, publicar do computador de um dev e copiar/embutir código em cada host.

**Consequências.**

- Hosts externos consomem um artefato público, imutável e revisável antes do v0 estável.
- Consumidores alfa devem fixar os assets e atualizar deliberadamente.
- Só o grafo web é prometido; os demais renderers seguem testados só no workspace até a #30.
- O alfa não afrouxa nem pré-aprova os gates estáveis.

## Pacotes afetados

Pacotes do grafo alfa (hoje consolidados — ver [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]]): [[chat-protocol]], [[chat]], [[chat-react]], [[chat-server]]. Scripts: `scripts/verify-alpha-artifacts.mjs`, `.github/workflows/release-alpha.yml`; documentação em `docs/releases/alpha-dogfood.md`.

## Substitui / substituído por

O desenho de pacotes foi consolidado pela [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]].

## Fonte

`docs/architecture/adrs/0020-public-alpha-dogfood-channel.md`.
