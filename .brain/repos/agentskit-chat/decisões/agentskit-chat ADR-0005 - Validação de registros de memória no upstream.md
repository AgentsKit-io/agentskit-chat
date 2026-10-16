---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0005-upstream-memory-record-validation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0005 - Validação de registros de memória no upstream

> [!tldr] Em linguagem comum
> Para validar mensagens salvas, o Chat usa o validador do AgentsKit em vez de reescrever os formatos de mensagem.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0005-upstream-memory-record-validation.md`.

## Decisão em linguagem comum

`@agentskit/chat-protocol` delega a validação de registros canônicos de mensagem ao subpath publicado `@agentskit/core/memory-validation`. O protocolo é dono apenas do envelope de aplicação, dos campos de ciclo de vida, dos diagnósticos e da política de compatibilidade. Se o validador upstream não expressar um registro canônico necessário, muda-se e publica-se o AgentsKit primeiro; é proibido validador paralelo, type assertion, cast de compatibilidade ou cópia local do schema.

## Contexto e consequências

**Contexto.** O envelope de snapshot precisa validar mensagens serializadas do AgentsKit; recriar schemas de mensagem, partes, tool calls, metadados ou memória duplicaria contratos canônicos e deixaria o framework divergir da base.

**Consequências.**

- O AgentsKit segue como fonte única dos registros de mensagem.
- Correções upstream chegam por atualização de dependência.
- Os testes do protocolo devem provar que registros hostis, cíclicos, profundos e não JSON falham de forma inerte.
- Um release do protocolo pode esperar um patch upstream.

## Pacotes afetados

[[chat-protocol]] (importa `validateMemoryRecord` de `@agentskit/core/memory-validation`, `packages/protocol/src/index.ts:3`); também `packages/chat/src/controlled.ts:2` em [[chat]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0005-upstream-memory-record-validation.md`.
