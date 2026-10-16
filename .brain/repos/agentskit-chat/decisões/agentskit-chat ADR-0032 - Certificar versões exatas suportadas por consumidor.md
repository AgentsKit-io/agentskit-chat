---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0032 - Certificar versões exatas suportadas por consumidor

> [!tldr] Em linguagem comum
> Cada consumidor do ecossistema é certificado na versão exata que realmente usa, em vez de todos terem de subir juntos para a mesma versão.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-16. Fonte: `docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md`.

## Decisão em linguagem comum

O schema v3 do livro-razão de adoção registra um conjunto fechado e auditado de versões: `minimumConsolidatedVersion` (primeira linha consolidada suportada que substitui os pacotes avulsos), `currentFrameworkVersion` (release público atual do repositório), `supportedConsolidatedVersions` (toda versão exata respaldada por evidência) e, por consumidor, uma `packageVersion` exata. Uma versão certificada tem de pertencer a esse conjunto; ranges de semver e versões intermediárias inferidas continuam proibidos, e a evidência de CI e produção segue obrigatória. O gate de deprecação dos pacotes legados pode ficar pronto quando todo consumidor ativo estiver certificado, usar uma versão consolidada suportada exata e declarar zero pacotes legados — sem exigir upgrade sincronizado para o minor mais novo.

## Contexto e consequências

**Contexto.** A ADR-0030 exige que cada chat de produto prove um artefato `@agentskit/chat` consolidado exato; a primeira implementação usou um único `frameworkVersion` global, obrigando todos a subir em lockstep — mais estrito que a decisão de deprecação e obscurecendo a verdade de produção (Docs, Registry, Playbook, Doc Bridge e o catálogo do Registry ainda provam a linha consolidada 0.3). Rejeitados: subir todos os hosts para 0.4 antes da deprecação e permitir ranges. O texto-fonte desta ADR tem frases truncadas em "Context", "Decision" e "Alternatives"; o conteúdo acima segue apenas o que está legível.

**Consequências.**

- O livro-razão descreve honestamente versões de produção mistas porém suportadas.
- Um consumidor não pode usar o livro-razão para alegar um range não comprovado ou uma versão futura.
- A versão atual do framework é checada contra o manifesto de release.
- Campanhas amplas de upgrade ficam separadas da remoção da orientação obsoleta do npm; a certificação final ainda resolve evidência fora da CI determinística imediatamente antes do gate HITL irreversível.

## Pacotes afetados

Repositório: `ecosystem-adoption.json`, `scripts/ecosystem-adoption-lib.mjs`, `scripts/check-ecosystem-adoption.mjs`, `release/manifest.json`, `docs/dogfood/ecosystem-adoption.md`.

## Substitui / substituído por

Estende a [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]].

## Fonte

`docs/architecture/adrs/0032-per-consumer-exact-adoption-versions.md`.
