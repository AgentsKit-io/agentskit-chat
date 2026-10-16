---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0022-shared-ask-service-integration.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0022 - Integração com o serviço Ask é aplicação compartilhada

> [!tldr] Em linguagem comum
> A integração com o serviço de perguntas e respostas (Ask) é escrita uma vez no Chat e usada por Docs, Registry e Playbook, em vez de cada site ter a sua cópia.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0022-shared-ask-service-integration.md`.

## Decisão em linguagem comum

`@agentskit/chat-protocol` é dono do schema versionado e limitado de eventos Ask e do decoder NDJSON. `@agentskit/chat` é dono de uma integração pública única composta de: um `AdapterFactory` que mapeia eventos Ask para o protocolo de conteúdo ordenado do assistente; projeção segura de `cite` para o componente padrão `source-list`; callback validado para ferramentas de apresentação do host; deadline só de conexão, cancelamento do stream upstream e fallback em texto; projeção de fio a partir das mensagens canônicas; e migração de sessões Ask legadas sobre `createWebStorageMemory` de `@agentskit/memory@0.11.0`. Hosts configuram só endpoint, corpus/persona, chaves de storage e um projetor opcional de ferramentas nativas. O deadline de conexão é limpo assim que os headers chegam; o corpo de uma resposta saudável é governado só pelo cancelamento do usuário.

## Contexto e consequências

**Contexto.** Os três sites repetiam schema de eventos, decoder, projeção de mensagens, segurança de citações, deadline, cancelamento e migração de sessão do navegador; isso já gerou timeout de stream inteiro em dois hosts e storage divergente do contrato de memória canônico. O protocolo Ask é de aplicação (não pertence ao Core) e a persistência de mensagens no navegador já é do AgentsKit Memory (lacuna resolvida em #1191/#1192).

**Consequências.**

- Docs, Registry e Playbook consomem uma implementação publicada e variam só em pontos explícitos de configuração e apresentação.
- Registros desconhecidos, malformados, grandes demais ou inseguros permanecem inertes.
- Mensagens canônicas, ciclo de vida, contrato de persistência e cancelamento seguem com o AgentsKit.
- Mudar o contrato do serviço Ask exige testes de conformidade e um novo artefato imutável antes da adoção pelos hosts.

## Pacotes afetados

[[chat-protocol]] (`packages/protocol/src/ask.ts`), [[chat]] (`packages/chat/src/ask.ts`), [[chat-server]] (`createAskServiceHandler`, `packages/server/src/ask-service.ts:133`), [[chat-docs]]. Fluxo: [[AgentsChat - Resposta local e escalada]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0022-shared-ask-service-integration.md`.
