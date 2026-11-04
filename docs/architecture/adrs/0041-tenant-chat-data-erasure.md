# ADR-0041: Tenant chat data erasure

Status: Proposed, 2026-11-01.

## Context

A data subject can ask for all their data to be erased (LGPD art. 18, VI). A chat application keeps one tenant's data in four places: session snapshots (`SessionStorage`), action decisions (`ToolDecisionStore`), transcripts (`ChatMemory`), and spend records (`CostStore` windows, reservations, and ledger rows). Each host had to find and delete them on its own, and could easily miss one.

## Decision

`@agentskit/chat/server` exports `eraseTenantChatData(options)`, with `TenantDataEraser`, `EraseTenantChatDataOptions`, `TenantErasureReceipt`, `TenantErasureError`, `TenantChatDataCategory`, and `TENANT_CHAT_DATA_CATEGORIES`.

- `options` names the `tenant` and one eraser per category: `sessions`, `decisions`, `memory`, `cost`. All four are required. A host that does not store a category passes `() => 0`, so leaving one out is a deliberate choice and not an oversight.
- An eraser `(tenant, signal) => number | Promise<number>` removes every record of that tenant, and only that tenant's, and returns how many it removed. It must be idempotent.
- The tenant ID must be non-empty and at most 256 characters. A blank ID is refused before any eraser runs, so a mistake cannot reach a `WHERE tenant_id = ''` delete.
- All four erasers run in one call, each with its own deadline (`timeoutMs`, default 30 s, through `@agentskit/net` `withTimeout`). A failure does not stop the others. On success the call returns `{ tenant, erased: { sessions, decisions, memory, cost } }`. If any eraser fails, it throws `TenantErasureError` with `failed` (the categories that failed), `erased` (counts from the ones that succeeded), and the causes as an `AggregateError`. The host retries the call. Because erasers are idempotent, a retry is safe.
- A turn already running can write again after its category is erased. Before calling, the host stops accepting new turns for the tenant, for example by refusing it in `authenticate`.

## Upstream boundary

ADR-0002 remains binding. Inspected `@agentskit/core` 1.15 `ChatMemory` (`clear` per memory instance), `ToolDecisionStore` (no delete), `@agentskit/observability` 0.13 `CostStore` and `postgresCostStore` (no delete), and the local `SessionStorage` (`delete` per session, no list API). No upstream port can delete by tenant, so a host-provided eraser per category is the seam. This repository orchestrates the erasure, validates the tenant ID, and reports the result. It does not implement storage. Tenant-scoped erase methods on the upstream ports are follow-up work for AgentsKit-io/agentskit. Once they ship, the erasers can delegate to them, and this contract stays the same.

## Consequences

- An additive export. No existing contract changes.
- Correctness depends on the host's erasers: each one must filter by tenant. The server test exercises real handler turns for two tenants and checks that only the target tenant's records are gone.
