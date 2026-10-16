---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0014-safe-cli-scaffolding.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0014 - Scaffolding seguro de aplicação numa CLI dedicada

> [!tldr] Em linguagem comum
> Uma CLI própria do Chat cria projetos de aplicação completos e nunca sobrescreve nada que já exista.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0014-safe-cli-scaffolding.md`.

## Decisão em linguagem comum

`@agentskit/chat-cli` é dono do comando `agentskit-chat init`. Usa só parsing, prompt e filesystem da biblioteca padrão do Node; detecta React, Expo/React Native ou Ink pelas dependências; só pergunta em TTY interativo; e promove atomicamente um projeto preparado em área temporária somente se o destino não existir. Os templates importam pacotes publicados do AgentsKit e do Chat e só acrescentam composição de aplicação — nenhum controlador, adapter, primitivo de renderer ou scaffold geral do AgentsKit é reproduzido.

## Contexto e consequências

**Contexto.** O AgentsKit já gera starters gerais e pacotes de extensão (`@agentskit/cli` `writeStarterProject`, `@agentskit/templates` `scaffold`), que não expressam uma fatia de aplicação do Chat. O Chat precisa de fatias completas (definição, servidor, renderer, testes, orientações) sem copiar templates upstream nem sobrescrever projetos do host.

**Consequências.**

- O CI tem um comando totalmente por flags e saída JSON de sucesso.
- A inicialização é idempotente por recusa, não por merge arriscado.
- Templates são testados instalando, checando tipos e rodando testes como fixtures reais de workspace.
- Novos renderers estendem o enum fechado e a matriz de conformidade.

## Pacotes afetados

[[chat-cli]] (`initChatProject`, `packages/cli/src/index.ts:177`; teste `packages/cli/tests/init.test.ts`).

## Substitui / substituído por

Ampliada pela [[agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes]] (de 3 para 7 renderers).

## Fonte

`docs/architecture/adrs/0014-safe-cli-scaffolding.md`.
