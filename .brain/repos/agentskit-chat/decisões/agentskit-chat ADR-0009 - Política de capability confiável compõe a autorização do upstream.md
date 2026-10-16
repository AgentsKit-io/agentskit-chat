---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0009-trusted-capability-policy.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0009 - Política de capability confiável compõe a autorização do upstream

> [!tldr] Em linguagem comum
> Quem pode executar uma ação é decidido por uma política confiável do host, nunca por texto vindo do modelo ou do usuário.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0009-trusted-capability-policy.md`.

## Decisão em linguagem comum

`createCapabilityPolicy` resolve o contexto por um callback do host a cada proposta e a cada checagem de execução, negando por padrão contexto ausente, sessão divergente, ação não registrada e capability faltante; uma lista vazia é uma ação explicitamente pública. `withActionPolicy` compõe essa decisão com qualquer autorizador existente via `ChatConfig.authorizeToolCall` (`@agentskit/core@1.12.0`). Cada decisão gera um trace imutável e reproduzível (ação, id da tool call, fase, capabilities exigidas, decisão, motivo, timestamp), sem contexto confiável nem argumentos; observadores de trace são isolados da aplicação da política.

## Contexto e consequências

**Contexto.** Confirmar prova intenção, não autoridade; claims de capability em mensagens, props ou argumentos não são confiáveis. A política precisa valer para ações do modelo e determinísticas sem embrulhar o executor do AgentsKit. Upstream: issue #1147 / PR #1148.

**Consequências.**

- Mensagens não concedem capabilities nem escolhem sessão confiável.
- Revogação é observada no momento da execução.
- O framework não traz motor RBAC, serviço de política de rede nem wrapper de executor.
- Auditoria durável e adaptadores de identidade são do host/servidor.

## Pacotes afetados

[[chat]] (`createCapabilityPolicy`, `withActionPolicy`), [[chat-devtools]] (consome `ActionPolicyTrace`), [[chat-example-shared]] (operações protegidas).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0009-trusted-capability-policy.md`.
