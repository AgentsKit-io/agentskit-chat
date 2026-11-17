# CI rules (organization CI standard)

Each rule says how it is verified. If the check fails, fix the code, not the check.

- **Mandatory pre-push.** `.husky/pre-push` runs the format check and the typecheck (`pnpm lint:biome && pnpm lint`). Verified by: `test -x .husky/pre-push`. Do not use `--no-verify`.
- **Run only what is affected.** Drafts run lint and typecheck; a ready PR runs the affected tests and build; nightly and production runs run everything. Verified by: `.github/workflows/ci-standard.yml`.
- **No fixed ports, dates or slots in contract and e2e tests.** Use a free port, one database per job and an injected clock. Verified by: review.
- **Actions cache: only the base branch writes; a PR only restores.** Verified by: review of the workflows.
- **Do not delete or skip a test to save time.** A slow or flaky test becomes a ticket; the gain comes from isolating it.
