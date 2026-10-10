---
"@agentskit/chat": minor
---

Add `client.action.decide` to protocol v1 and to the chat handler: a tool call that requires confirmation can be approved or denied in a later request, on any instance. The handler's new `decisions` option takes the upstream `ToolDecisionStore`; one atomic claim admits a single execution, the model resumes in the deciding request's stream, a repeated decision replays the stored result, and failures are typed (`ACTION_NOT_FOUND`, `ACTION_ALREADY_DECIDED`, `ACTION_DECIDE_UNAVAILABLE`). `@agentskit/chat/drizzle-pg` adds `createDrizzleDecisionStore`, `chatDecisionTable` and `chatDecisionDDL`.

Add the handler's `cost` option: reserve against a durable upstream `CostStore` before the model runs, commit real usage with a ledger entry afterwards, release on failure or cancellation, answer 402 `QUOTA_EXCEEDED` when the plan limit is reached, and report `quota.utilization` / `quota.warning` in the first snapshot.

The `@agentskit/core` peer floor rises to `^1.15.0`. `@agentskit/observability` (`>=0.13.0`) is a new optional peer, needed only by hosts that set `cost`.
