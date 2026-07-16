# Release process

Stable publishing is intentionally HITL and runs only from
`.github/workflows/release.yml` on a stable `v*` tag contained in `main`.

## Prepare

1. Add a Changeset for every public behavior or contract change.
2. Run `pnpm version:packages`, review the fixed-group versions/changelogs, and
   update `release/manifest.json` plus the release notes.
3. Run `pnpm release:gate`, `pnpm release:pack`, and the full CI matrix.
4. Obtain architecture, security/privacy, compatibility, and launch review.
5. Merge the release PR. Create the stable tag only after all required checks
   and the protected `npm` environment are ready.

## Publish

The workflow verifies tag ancestry and exact fixed-group versions, installs
from the lockfile without a dependency cache, runs every quality/conformance,
browser, native, PTY, documentation, package, and clean-room gate, then packs
both public packages with SHA-256 checksums. The protected publish job uses a
GitHub-hosted runner with `id-token: write` and npm provenance.

The `0.1.0` bootstrap used a short-lived token because the package names did
not yet exist. That credential has been removed. Both public packages now trust
`AgentsKit-io/agentskit-chat`, workflow `release.yml`, environment `npm`; npm 11
uses GitHub OIDC and every publish requests public access and provenance. A
GitHub release is made public only after both npm publishes succeed.

See npm's official guidance for
[trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[provenance](https://docs.npmjs.com/generating-provenance-statements/), and
[scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Verify

Confirm both npm pages show the version in `release/manifest.json` and
provenance, install the package graph from npm in a clean directory, run
`npm audit signatures`, verify GitHub assets against `SHA256SUMS`, and smoke the
declared product-chat hosts. Record links and results on
[issue #104](https://github.com/AgentsKit-io/agentskit-chat/issues/104) before
closing the milestone.

## Retire legacy package names

Package retirement is a separate HITL action. `release/legacy-package-deprecations.json`
owns the exact ten old package names, replacement subpaths, and canonical
migration route. Generate the dry-run with:

```bash
pnpm release:deprecation:plan
```

The command is read-only. Add `-- --require-ready` to fail unless every active
consumer in `ecosystem-adoption.json` is certified and no legacy package is
declared. It intentionally provides no mutation mode. The generated report
includes the exact apply, verify, rollback, and stop procedure for every
package. Only after that complete artifact receives explicit approval may the
release owner run its operations manually, one at a time, attaching the npm
re-read after each mutation and stopping on the first mismatch or registry
failure.
