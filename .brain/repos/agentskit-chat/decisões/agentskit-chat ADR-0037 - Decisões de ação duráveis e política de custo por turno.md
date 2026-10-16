---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0037 - Decisões de ação duráveis e política de custo por turno

> [!tldr] Em linguagem comum
> A decisão de aprovar ou negar uma ação pode chegar em outra requisição (até em outro servidor) e ser executada uma única vez; cada turno também pode ter um teto de custo.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Proposed, 2026-10-09; revisão de evidência pendente. Data: 2026-10-09. Fonte: `docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md`.

## Decisão em linguagem comum

Protocolo v1 ganha o evento aditivo `client.action.decide` com `{ token, decision: "approve" | "deny", reason? }`; o servidor que o aceita anuncia a capacidade `action-decide-v1` no primeiro snapshot do turno e `token` é o id da tool call pendente. `createChatHandler` recebe `decisions(context, sessionId, signal)`, que devolve o `ToolDecisionStore` upstream restrito ao tenant e sessão autorizados: turnos de submit passam o store ao controlador upstream (que grava cada chamada que exige confirmação como pendente); uma requisição de decide reivindica o lease, monta um controlador a partir das mensagens salvas e chama `controller.decide`, cuja transição atômica `pending → claimed` admite uma execução; decisão repetida para um token já resolvido reproduz a transcrição como um snapshot, sem lease, tool ou modelo; falhas tipadas: token desconhecido 404 `ACTION_NOT_FOUND`, decisão diferente ou em andamento 409 `ACTION_ALREADY_DECIDED`, sem store 501 `ACTION_DECIDE_UNAVAILABLE`. `@agentskit/chat/drizzle-pg` ganha `createDrizzleDecisionStore(db, tenantId, sessionId)`, `chatDecisionTable` e `chatDecisionDDL` (claim e settle são `UPDATE`s condicionais únicos). Política de custo: `cost(context, sessionId, signal)` devolve um `TurnCostPolicy` (com o `CostStore` upstream, tenant, teto, valor a reservar e função de preço) ou `undefined`; depois do lease o handler reserva `reserveUsd`; reserva negada libera o lease e devolve 402 `QUOTA_EXCEEDED` antes de qualquer chamada ao modelo; após o dispatch todo turno confirma `priceUsd(usage)`, inclusive em falha/timeout/cancelamento (uso desconhecido cobra `reserveUsd`); o primeiro snapshot de um turno medido carrega `quota: { utilization, warning }` (aviso a partir de `warnAt`, padrão 0,8).

## Contexto e consequências

**Contexto.** Uma tool com `requiresConfirmation` interrompe o turno e a decisão chega numa requisição posterior, possivelmente em outra instância; antes, o handler só aceitava `client.turn.submit`, então um host reconstruía o controlador e chamava um `approve` local da geração, que ou não fazia nada ou, vindo de duas requisições, executava a tool duas vezes. Totais de gasto em processo não valem entre instâncias. Depende dos releases upstream com `ToolDecisionStore` (`@agentskit/core` 1.15) e `CostStore` (`@agentskit/observability` 0.13).

**Consequências.**

- Protocolo v1 segue compatível: evento e campo `quota` são aditivos.
- O piso de peer de `@agentskit/core` sobe para `^1.15.0`; `@agentskit/observability` vira peer opcional (só tipos, para hosts que configuram `cost`).
- Um claim que cai antes de resolver fica `claimed` e nunca é reexecutado automaticamente — o host reconcilia.
- O claim admite uma execução, mas não é transação com a escrita de domínio (mantenha `unique(tool_call_id)` como segunda barreira); `commit` registra o gasto real mesmo acima da reserva; retomar uma decisão exige as mensagens do turno (configure `definition.chat.memory` em produção).

## Pacotes afetados

[[chat-server]] (`createChatHandler` — `decisions` e `cost` em `packages/server/src/index.ts:33,35`, 402 em `:182`, 501 em `:123`; testes `packages/server/tests/decide.test.ts`, `cost.test.ts`), [[chat-protocol]] (`packages/protocol/tests/decide.test.ts`), [[chat]] (`createDrizzleDecisionStore` `packages/chat/src/drizzle-pg.ts:84`; contrato `tests/storage-pg/decision-contract.ts`).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0037-durable-action-decisions-and-turn-cost.md`.
