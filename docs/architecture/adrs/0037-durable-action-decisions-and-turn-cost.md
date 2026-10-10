# ADR-0037: Durable action decisions and turn cost policy

Status: Proposed, 2026-10-09; evidence review pending. Depends on the upstream releases that contain `ToolDecisionStore` (`@agentskit/core` 1.15) and `CostStore` (`@agentskit/observability` 0.13).

## Context

A tool marked `requiresConfirmation` stops the turn. The decision arrives in a later HTTP request, possibly on another instance. Before this ADR the handler accepted only `client.turn.submit`, so a host had to rebuild a controller and call the generation-local `approve`, which either did nothing or, from two requests, executed the tool twice. Spend limits had the same shape of problem: process-local totals do not hold across instances.

## Decision

### `client.action.decide`

Protocol v1 gains the additive client event `client.action.decide` with payload `{ token, decision: 'approve' | 'deny', reason? }`. A server that accepts it announces the capability `action-decide-v1` in the first snapshot of a turn. `token` is the identifier of the pending tool call as it appears in the snapshot.

`createChatHandler` takes `decisions(context, sessionId, signal)`, which returns the upstream `ToolDecisionStore` scoped to the authorized tenant and session. With it:

- submit turns pass the store to the upstream controller, which records each confirmation-required call as pending;
- a decide request claims the turn lease, builds a controller from stored messages, and calls upstream `controller.decide`. The store's atomic `pending → claimed` transition admits one execution; the tool result and the resumed model output stream as snapshots of that same response;
- a decision for a settled token replays the stored transcript as one snapshot, with no lease, tool call, or model call;
- typed failures: unknown token → 404 `ACTION_NOT_FOUND`; different decision, or a decision in flight → 409 `ACTION_ALREADY_DECIDED`; no store configured → 501 `ACTION_DECIDE_UNAVAILABLE`. A request that only lost the lease or the cursor race keeps the existing retryable 409 `SESSION_BUSY` / `SESSION_CONFLICT`.

`@agentskit/chat/drizzle-pg` adds `createDrizzleDecisionStore(db, tenantId, sessionId)` with `chatDecisionTable` and `chatDecisionDDL`. Claim and settle are single conditional `UPDATE` statements. The store is a port: a host may pass its own implementation, for example one that delegates the claim to an existing approval table.

### Turn cost policy

`createChatHandler` takes `cost(context, sessionId, signal)`, which returns a `TurnCostPolicy` or `undefined` for an unmetered turn. The policy carries the upstream `CostStore`, the tenant, the cap read from the host's plan data, the amount to reserve, and a pricing function.

- After the turn lease is claimed the handler reserves `reserveUsd` under the unique id `sessionId:turnId:createId()`. A denied reservation releases the lease and returns 402 `QUOTA_EXCEEDED` before any model call.
- After model dispatch, every turn commits `priceUsd(usage)` with one ledger entry, including failure, timeout, or cancellation; unknown usage charges `reserveUsd`. The reservation is released only when no model call started. A custom `createId` must return a unique ID on every call to prevent reservation reuse and quota bypass.
- The first snapshot of a metered turn carries the additive field `quota: { utilization, warning }`; `warning` is true from `warnAt` (default 0.8).

## Upstream boundary

ADR-0002 remains binding. The claim protocol, decision replay, tool execution, and model resume are upstream `controller.decide`; the store contract is upstream `ToolDecisionStore`; spend accounting is upstream `CostStore`. This repository adds the HTTP event, status mapping, the lease around the decision, and a PostgreSQL implementation of the upstream decision port. No upstream source is copied.

## Consequences

- Protocol v1 stays compatible: the new event and the `quota` field are additive, and a client that never sends a decision is unaffected.
- `@agentskit/core` peer floor rises to `^1.15.0`. `@agentskit/observability` becomes an optional peer, needed only for the types of a host that sets `cost`.
- A claim that crashes before it settles stays `claimed`. It is never re-executed automatically; the host reconciles it.
- The claim admits one execution but is not a transaction with the domain write. Domain tables written by tools should keep `unique(tool_call_id)` as a second barrier.
- `commit` records real spend even above the reservation, so `reserveUsd` should be an upper estimate when the cap must not be passed.
- Resuming a decision requires the turn's messages: configure `definition.chat.memory` in production.
