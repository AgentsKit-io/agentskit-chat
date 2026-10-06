# CH-D — reference parts and uploads (2026-10-06)

State: **BLOCKED for the original RF-07–11 outcome**; the independently implementable
layer is implemented and locally validated. No parent-task completion or approval is claimed.

## Contract and authorization

Task `task_3a3d6b78c1bd`, dispatch `ctx_35c6ba25cd9b`; intent: implement in this worktree.
Scope: protocol/server, their tests/READMEs, public API snapshot, ADR, local changeset
and this report. Out of scope: upstream source changes, UI, real accounts, R2 buckets,
push/PR/release/deploy. Budget: cached dependencies, one local storage container,
local workerd, at most two Vitest workers, no CI. Do not stop other owners' processes.
Tracking remains the supplied Orca task; no external issue was created.

Coordinator reply during this dispatch confirmed **no published core accepts parts**
and authorized only additive/negotiated protocol, reference upload and handler
validation; delivery stays unavailable pending supported upstream publication.
It also confirmed ORCA_PLAYBOOK.md is absent/not required and assigned doc-bridge
compatibility investigation to INV-DB. No CH-A private import or CH-B cherry-pick was used.

## Current-source evidence

Code commits: `ff2c5b2` (protocol), `7b447875dddb9ccfeb1c4e4acdf1ea66f2932f04`
(server/uploads/docs/changeset). Final test run: 2026-10-06, Vitest start 19:27:37
server and 19:27:42 protocol (tool session 86409). The later report-only commit does
not change tested source. Installed upstream core: 1.12.3; its send method remains
string-only. Upstream adoption and deferred integration decisions are in ADR-0035.

| Criterion | Status | Evidence and limits |
|---|---|---|
| RF-07 / C1: additive v1 parts plus legacy strings | Partially validated | `parts.test.ts` accepts text/file references and capability fields; server legacy string flow returns 200 in Node/workerd. A parts turn cannot return 200 yet: valid negotiated references return typed 501. |
| §8.5 / C2: capability negotiation | Validated for disabled capability | Optional capabilities round-trip in snapshots; first real handler snapshot advertises an empty list. Parts without echo return 400. No supported upstream delivery capability is advertised or enabled. |
| RF-08 / C3: reference-only, JSON bound | Validated | Strict file objects reject inline fields; upload metadata rejects binary/base64 fields; bounded JSON preserves 413 over 64 KiB; no multipart/binary chat body is implemented. |
| RF-09 / C4: S3 port and signatures | Partially validated | Real SeaweedFS 4.17 Docker: bucket creation, SigV4 PUT/GET, exact signed byte-count/MIME headers, 300-second PUT and 60-second GET, digest validation. Invalid expiry above 600 rejected. Same implementation exercised inside workerd. MinIO image pull was denied; real MinIO, R2 and AWS S3 were not exercised. |
| RF-10 / C5: optional upload endpoint and scoped integrity | Validated locally | Real workerd POST /uploads returns 201, direct PUT returns 200, cross-tenant turn returns 403, checksum mismatch 422, oversized metadata 413, unsupported MIME 415, forbidden session 403. Unit/contract checks also cover cross-session references, truncated/missing objects, malformed metadata and timeout recovery. |
| RF-11 / C6: reference delivery to controller/adapter | Blocked | Published `ChatController.send(text: string)` cannot preserve parts. `BlobStore.presignGet` is tested, but no adapter delivery or public persistent URL is implemented. Requires tracked/published upstream API, expiry/retry/immutability design review, then real adapter acceptance. |
| C7: documented code gates | Validated within declared scope | Protocol/server builds and strict lint, their coverage suites, public API snapshot check, cross-platform ratchet and diff whitespace check pass. Full-repository build/test/e2e/release were not run. |
| C8: documentation routing gate | Blocked | `pnpm docs:bridge:query ownership server --agent` exits 1: installed doc-bridge rejects index fields including contentHash, symbols, checksSource, inputs/retrieval/projection. No stale gate success is claimed; no regenerated index committed. INV-DB owns resolution. |
| C9: review/cleanup | Partially validated | ADR remains Proposed; human evidence/ADR review pending. Task container, local worker and temporary mounted config/module entry were stopped/removed; shared dependency/build caches retained. No UI was touched, so browser/screenshot/visual approval is not applicable. |

Final suites: server **33/33**, protocol **94/94**, no skipped tests with both integration
variables enabled. Coverage (statements/branches/functions/lines): server
**95.26/91.53/89.88/98.87%**; protocol **92.09/86.87/93.75/94.65%**. All configured
package floors pass. These gates validate only the above local criteria.

Commands used for final evidence:

```sh
CHD_S3_ENDPOINT=http://127.0.0.1:32768 CHD_WRANGLER_URL=http://127.0.0.1:18789 pnpm --filter @agentskit/chat-server exec vitest run --config ../../vitest.coverage.ts --coverage --maxWorkers=2
pnpm --filter @agentskit/chat-protocol exec vitest run --config ../../vitest.coverage.ts --coverage --maxWorkers=2
pnpm --filter @agentskit/chat-server lint
pnpm --filter @agentskit/chat-protocol lint
pnpm check:public-api
pnpm check:cross-platform
```

For replay, start an isolated SeaweedFS 4.17 S3 gateway with a mode-600 synthetic
identity config mounted read-only (the test uses the local MinIO-default fixture
identity), expose its 8333 port only on loopback and set CHD_S3_ENDPOINT accordingly.
The integration test creates its task bucket. For workerd, create a temporary module
entry importing the named `uploadWorker` from
`packages/server/tests/fixtures/upload-worker.ts` and exporting it as the platform's
default entry, then run the installed docs-package `wrangler dev` locally with
`--var S3_ENDPOINT:<local-endpoint> --port 18789 --name chd-contract
--compatibility-date 2026-10-01`. Do not use real cloud credentials. Remove the
container and temporary entries/config after replay.

## Unresolved and excluded evidence

Validated: the local reference-policy layer and listed code gates.
Partially validated: RF-07, RF-09, review/cleanup criterion as described above.
Blocked: upstream parts delivery, doc-bridge gate and pending human ADR/evidence review.
Not analyzed: real MinIO/R2/S3, frontend clients, production CORS, durable object
immutability/URL expiry across memory retry, full-repository release readiness.
Not applicable: UI/browser/screenshot validation, publication/deployment and CI.

CH-B `known-gaps.test.ts` was inspected but not cherry-picked: converting its
expected 200 parts failure to a passing 200 would manufacture evidence while core
is unavailable. New ordinary passing tests assert the actual reference policy,
413 boundary and explicit 501 gate; the original parts-to-adapter success remains
blocked rather than relabeled green. Stage-3 approval/storage work remains outside
this dispatch.

Next coordinator/human action: review the local layer and ADR-0035, resolve the
INV-DB environment gate, and track/publish upstream string-or-parts send support
under authorized release work before enabling capability and asserting RF-07/RF-11
success. No push, PR, release, deploy, real credentials or unrelated process
termination occurred.

## SHA-256 bindings for tested files

- `packages/protocol/src/index.ts`: `c6f491ad6e92bf4ffe152f930974adac014eb300a56a99fd3d672526c77de27a`
- `packages/server/src/index.ts`: `25b7f955364d419a6fa5724a12ffceae9cafe0b29bf92bf775c70f64d8ada498`
- `packages/server/src/uploads.ts`: `36af26695a5ff65ca207683ff2a8eafbc45435cc82f7badf7ea84b8bc86f954d`
- `packages/protocol/tests/parts.test.ts`: `8033e89563a8428a648f1dc9693f35c6cf35f1eca5e269f77eb65fde1e804f46`
- `packages/server/tests/uploads.test.ts`: `a40d2a1ca6638042300dc08f7be3479be0db8849412627371cb38025739a28ec`
- `packages/server/tests/fixtures/upload-worker.ts`: `1dcd2440e2a05ff3425f44104fbd2ba9d1575e9ad27b18936fb9eb6ecf7dd5cc`
- `pnpm-lock.yaml`: `6d49df4a5d28022dfcbf613dc9523b3f6641e9df133ef2cb9589d5c308fe8899`
