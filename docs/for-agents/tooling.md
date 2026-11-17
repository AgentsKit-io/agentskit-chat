# Repository tooling handoff

## Read first

- [Repository rules](../../AGENTS.md)
- [Contribution guide](../../CONTRIBUTING.md)
- [Stable release](./release.md)
- [Release process](../releases/release-process.md)

## Ownership

These top-level edit roots hold repository tooling rather than a published
package. Each has an ownership entry in `doc-bridge.config.json` that routes
here.

- `scripts`: repository gates and generators (`scripts/release-gate.mjs`,
  `scripts/conformance-gate.mjs`, `scripts/bundle-budget.mjs`,
  `scripts/check-public-api.mjs`, `scripts/ci/`) and their colocated
  `*.test.mjs` suites, run with `pnpm exec vitest run scripts/<file>.test.mjs`.
- `tests`: cross-package suites: Playwright browser end-to-end tests in
  `tests/e2e`, the turn-protocol conformance suite, the conformance gate test
  and the Postgres storage suites in `tests/storage-pg`.
- `conformance`: `conformance/manifest.json`, the component, event and platform
  evidence that `pnpm conformance:report` and `pnpm conformance:gate` check.
- `examples`: install and README verification scripts
  (`examples/init-react.sh`, `examples/verify-readme.mjs`). Runnable example
  applications live under `apps/` and have their own agent docs.

## Checks

```bash
pnpm lint
pnpm test:conformance
pnpm conformance:gate
pnpm docs:bridge:gate
```

Regenerate generated artifacts with their script instead of editing them by
hand. The Postgres suites in `tests/storage-pg` need a local Postgres 16 test
database; without one they run in the `runtime-contract` CI job.
