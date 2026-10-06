# CH-B — contract and evidence

Status: BLOCKED (implementation verified within the scope below; full task not complete). Source baseline: f49d58cb8869825dca3658990e9dab548c1d3d1f.
Dispatch: task_dc7edd3d0fd0 / ctx_e29c36cc2d76.

## Approved contract

Implement track 04 stages 0 and 2 in this worktree only, with local commits, docs and changesets; no push, PR, publication, deployment or real accounts. Core source is read-only. Coordinator confirmed the narrowed contract via Orca ask: no ADR-0002 exception; implement SessionStorage here and leave ChatMemory to an upstream worker. No UI changes or human visual review apply. Validation budget: cached pnpm dependencies, one local disposable PostgreSQL 16 container, local wrangler, deterministic adapters, repository CI checks; no provider calls or CI runs.

| Criterion | Required evidence | Status |
|---|---|---|
| C0 baseline local CI | Repository CI commands; gaps reported individually | see final reconciliation below |
| C1 approval restart/no-op and concurrency regressions | Real public handler and independent upstream controllers, documented expected failures | see final reconciliation below |
| C2 image rejected 400 / inline oversized 413 | Handler regression with reference input and bounded JSON | see final reconciliation below |
| C3 RF-13 tenant isolation | Shared contract load/save/delete, separate tenant key | see final reconciliation below |
| C4 RF-14 atomic cursor CAS | 100 concurrent saves per runtime, exactly one winner and persisted cursor | see final reconciliation below |
| C5 RF-15 lease and 409 codes | Durable claims, handler SESSION_BUSY, release/recovery 200, SESSION_CONFLICT boundary | see final reconciliation below |
| C6 RF-16 SessionStorage Node/Workers | Same suite on pg Pool and request Client in wrangler dev; close via waitUntil | see final reconciliation below |
| C7 RF-12 ChatMemory / full RF-16 | Supported upstream Drizzle ChatMemory release | blocked upstream |
| C8 Neon / real OpenRouter / AI Gateway | Authorized external test accounts | blocked by task's no-real-accounts constraint |
| C9 packaging/docs/cleanup | build, API snapshot, changeset, diff/status, container/process removal | see final reconciliation below |

Out of scope: fixing stage 3 confirmation or stage 9 uploads, provider adapters, starter, consumers, AKOS, upstream edits, production readiness. SessionStorage has no listing API; isolation evidence maps only to its load/save/delete operations. No credentials are needed: the Docker database uses trust authentication bound to localhost with synthetic data.

## Upstream adoption

Inspected `agentskit/packages/core/src/types/memory.ts`, `packages/memory/package.json`, source exports/backends and `vector/pgvector.ts`; there is no ChatMemory Drizzle/Postgres backend. ChatMemory belongs upstream under ADR-0002 and is not reimplemented here. Reuse local published contracts `SessionStorage`, `SessionSnapshotSchema`, `resumeChatSession`, `SessionConflictError`, and upstream `ChatController`/AdapterFactory; only the application envelope adapter is added. The spike is behavioral reference only, not copied source.

The spike used core 1.14.1; this repo's pinned core 1.12.x has no approvalGenerations guard and can execute restored calls. The exact newer-core no-op symptom remains a documented skipped test; the current public handler's missing decision event and independent-controller double execution are executable expected failures. This distinction must remain explicit when reporting stage 0.

## Final reconciliation

Implementation commit: `4a08da009e9222298fca8b43ef2b99765ba799ca`. Current source is bound by the per-file SHA-256 manifest and aggregate fingerprint in [durable evidence](./evidence/ch-b-session-storage.json); the subsequent commit adds this report and the regression tests included in that manifest. Report edits do not alter the validated source fingerprint.

### Validated

- C2: explicit positive checks record image parts and action decisions as 400 `REQUEST_INVALID_EVENT`, and inline oversized input as 413 `REQUEST_TOO_LARGE`; reference acceptance is an expected failure for stage 9.
- C3/RF-13: both runtimes isolate load/save/delete by tenant and allow independent tenant keys. SessionStorage exposes no list method; listing is not applicable to this port.
- C4/RF-14: the shared contract runs 100 concurrent same-cursor save pairs per runtime; exactly one wins and the final cursor is persisted. Node uses real pool connections; the Worker uses its request Client.
- C5/RF-15: durable competing lease claims, overlapping handler requests producing 200 + 409 `SESSION_BUSY`, release/recovery to 200, and a real stale-cursor SQL UPDATE producing 409 `SESSION_CONFLICT` at the handler boundary.
- C6 (SessionStorage portion of RF-16): the same suite passes against PostgreSQL 16.15 in Docker from Node and from a fresh `wrangler dev` workerd process. Worker response is HTTP 200 with five criterion results. Driver is per request and closed through waitUntil; the post-run query reports zero other test connections.
- C9 (package portion): strict production lint, strict fixture typecheck, chat build including declarations, API snapshot check, conformance (5 tests), changeset status, chat tests (122) and server tests (27 normal + 3 expected failures + 1 skip), with repository coverage floors passing. The optional peer is isolated to the new subpath. ADR, README, RLS example and upstream-adoption record are updated.

### Partially validated

- C1/stage 0: current handler decision support and independent-controller duplicate execution are covered by executable `test.fails`. This establishes current missing decision handling and the absent durable execution claim, not a fix. Exact core 1.14.1 `approvalGenerations` restart/no-op is skipped because the repository installs core 1.12.x; the newer symptom remains evidenced only by the supplied spike, not freshly reproduced here.
- RF-12 and RF-16: SessionStorage is implemented and locally verified; ChatMemory and Neon are not. These requirements must not be called complete.
- C9: task artifact verification passed, but the full repository packaging/release matrix was not established.

### Blocked

- C0: local CI is **not green**. `pnpm docs:bridge:gate` fails `index-freshness` with the main index preserved. Initial ownership query rejected newer index fields (`contentHash`, `symbols`, `checksSource`, `inputs`, `retrieval`, `projection`) using pinned doc-bridge 1.12.0. Re-indexing temporarily worked but removed about 32k generated lines; the coordinator explicitly required restoring the main index and treating this as an environment/baseline blocker. Both tracked generated files were restored. Doctor diagnostics include stale/unlinked/undocumented areas; they are not semantic architecture validation.
- C7: no ADR exception was authorized. The missing generic ChatMemory Drizzle backend belongs in `agentskit/packages/memory`; the coordinator assigned upstream work separately. No upstream files were edited and no private workspace imports were introduced.
- C8: real Neon, Hyperdrive, OpenRouter and AI Gateway tests remain pending under the no-real-accounts restriction.

### Not analyzed

RLS enforcement (only an optional SQL policy example is documented), real Neon/Hyperdrive behavior, provider requests, throughput/latency readiness, complete UI/browser/PTY/Expo parity, full bundle/release/pack/README/ecosystem matrix. Broad local lint/build were attempted with both the shell's Node 25 and CI's Node 22; long-running broad processes were stopped after the known doc gate blocked full CI. Package checks and the real contract passed, but that is not evidence for the omitted matrix. No remote CI was started.

### Not applicable

UI visual approval and UI-specific accessibility/responsive/contrast evidence: no UI was touched. External publication authorization: no push, PR, release, package publication or deployment occurred. No production credential was used or emitted. ORCA_PLAYBOOK.md was absent; the coordinator said it was unnecessary for this dispatch, and no worker was spawned or resumed.

## Cleanup and next action

Task-owned database/container, wrangler process, local wrangler cache and temporary validation logs are removed after durable evidence is written. No pre-existing container/file is deleted. The final diff and status are checked and changes are committed locally.

Required next coordinator action: repair or approve the doc-bridge baseline path, consume the supported upstream ChatMemory backend once available, and rerun the full required CI matrix plus authorized Neon/Hyperdrive validation. Keep the stage 3/9 expected failures until their implementations pass; rerun the exact approval no-op after the newer core is adopted. This worker reports `failed` because full CI/task acceptance remains blocked, despite the verified SessionStorage artifact.
