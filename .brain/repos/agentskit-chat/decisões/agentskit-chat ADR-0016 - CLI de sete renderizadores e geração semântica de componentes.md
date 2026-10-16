---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes

> [!tldr] Em linguagem comum
> A CLI passa a suportar os sete frameworks e a gerar componentes novos com uma definição neutra mais um arquivo nativo por framework.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md`.

## Decisão em linguagem comum

A CLI é dona de um enum fechado de sete renderers usado por detecção, `init`, ajuda, completion e testes. `init` mantém a promoção atômica em área temporária. `add component` recebe uma lista explícita de renderers separada por vírgula, valida o nome portável, checa cada destino e limite de symlink antes de escrever, desfaz os arquivos criados se falhar, e cria uma definição Zod estrita mais os arquivos nativos escolhidos. A definição gerada contém schema, chave semântica, metadados de evento, acessibilidade, capabilities e fallback; os arquivos nativos contêm só apresentação; o host registra explicitamente a definição e liga os arquivos pelos slots do renderer.

## Contexto e consequências

**Contexto.** A CLI inicial suportava React, React Native e Ink; o framework agora tem sete renderers e um catálogo semântico fechado. O scaffolding deve preservar um contrato neutro sem virar um segundo runtime nem copiar starters do AgentsKit. Rejeitados: gerar a partir de componentes de framework, motor de templates e estender scaffolds do AgentsKit.

**Consequências.**

- Detecção e layouts gerados são auditáveis como uma matriz fechada.
- Adicionar renderer exige atualizar templates, golden tests, testes de instalação/typecheck, ajuda e completion juntos.
- A geração nunca edita um manifesto automaticamente (evita reescrita insegura de código).
- Arquivos existentes causam recusa antes de qualquer escrita.

## Pacotes afetados

[[chat-cli]] (`CHAT_RENDERERS` `packages/cli/src/index.ts:7`, `addChatComponent` `:230`, `packages/cli/src/bin.ts`).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0016-seven-renderer-cli-and-semantic-component-generation.md`.
