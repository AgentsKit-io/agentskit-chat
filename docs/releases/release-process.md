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
all 12 public packages with SHA-256 checksums. The protected publish job uses a
GitHub-hosted runner with `id-token: write` and npm provenance.

The package names do not exist on npm before `0.1.0`. npm requires a package to
exist before a trusted publisher can be attached. Therefore the owner must:

1. provide a short-lived, least-privilege npm token to the protected `npm`
   environment for the one-time bootstrap publish;
2. after all packages exist, configure each package to trust
   `AgentsKit-io/agentskit-chat`, workflow `release.yml`, environment `npm`;
3. remove the bootstrap token and require OIDC for later releases.

The workflow supports both states without changing source: it uses the
bootstrap token only when present; otherwise npm 11 detects GitHub OIDC. Every
publish requests public access and provenance. A GitHub release is made public
only after all npm publishes succeed.

See npm's official guidance for
[trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[provenance](https://docs.npmjs.com/generating-provenance-statements/), and
[scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Verify

Confirm all 12 npm pages show the version in `release/manifest.json` and provenance, install the package graph
from npm in a clean directory, run `npm audit signatures`, verify GitHub assets
against `SHA256SUMS`, and smoke the Docs, Registry, and Playbook hosts. Record
links and results on issue #30 before closing the milestone.
