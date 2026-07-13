# Stable release handoff

## Read first

- [Release process](../releases/release-process.md)
- [Compatibility matrix](../releases/compatibility.md)
- [Stability policy](../releases/stability.md)
- [Security policy](../../SECURITY.md)
- [Repository rules](../../AGENTS.md)

## Ownership

`release/manifest.json` is the source of truth for the fixed public package
graph and renderer set. Package manifests own exact peer ranges and exports.
The conformance manifest owns component/event/platform evidence. Changesets own
future version intent; accepted ADRs/RFCs own contract change decisions.

Do not publish from a developer machine. A stable tag contained in `main`
starts the protected `npm` environment workflow. The one-time first publish may
use only the documented short-lived bootstrap credential; subsequent releases
use the configured npm trusted publisher and GitHub OIDC.

## Checks

```bash
pnpm lint
pnpm test:conformance
pnpm test
pnpm build
pnpm conformance:gate
pnpm docs:bridge:gate
pnpm test:e2e
pnpm test:pty
pnpm release:gate
pnpm release:pack
```

Do not close a release issue until npm provenance, clean npm installation,
GitHub checksums, host smoke tests, and human launch review are linked publicly.
