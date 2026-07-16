# ADR-0032: Certify exact supported versions per consumer

- **Status:** Accepted
- **Date:** 2026-07-16
- **Issue:** [#103](https://github.com/AgentsKit-io/agentskit-chat/issues/103)
- **Extends:** [ADR-0030](./0030-ecosystem-product-chat-convergence.md)

## Context

ADR-0030 requires every product chat to prove an exact consolidated
`@agentskit/chat` artifact. The first ledger implementation represented that
requirement with one global `frameworkVersion`, which unintentionally required
every consumer to upgrade in lockstep.

That is stricter than the deprecation decision requires and obscures production
truth. AgentsKit Docs, Registry, Playbook, Doc Bridge, and the Registry catalog
still prove the supported consolidated 0.3 line. The framework-owned portal and
AKOS prove 0.4. All are free of the legacy standalone package names.

## Decision

Adoption schema v3 records an audited closed version set:

- `minimumConsolidatedVersion` is the first supported consolidated line that
  replaces the standalone packages;
- `currentFrameworkVersion` is the repository's current public release;
- `supportedConsolidatedVersions` lists every exact release backed by adoption
  evidence; and
- each consumer continues to record one exact `packageVersion`.

A certified consumer version must be a member of that closed set. Semver ranges
and inferred intermediate versions remain forbidden. CI and production evidence remain mandatory, and the
private AKOS envelope is narrowed to a `chat-convergence-pass` so it cannot be
misread as certification of unrelated product capabilities.

The legacy-package deprecation gate may become ready when every active consumer
is certified, uses an exact supported consolidated version, and declares zero
legacy packages. It does not require a synchronized upgrade to the newest
minor release.

## Consequences

- The ledger describes mixed but supported production versions honestly.
- A consumer cannot use the ledger to claim an unproven range or future release.
- The current framework version is checked against the release manifest.
- Broad upgrade campaigns remain separate from removal of obsolete npm guidance.
- Final certification still resolves evidence outside deterministic repository
  CI immediately before the irreversible HITL gate.

## Alternatives considered

1. Upgrade every host to 0.4 before deprecation — rejected because 0.3 already
   uses the consolidated package and has no dependency on the legacy names.
2. Allow semver ranges — rejected because a range is not artifact evidence.
3. Keep the global field and special-case AKOS — rejected because exceptions
   weaken the schema and hide the actual consumer version.

## Acceptance

Accepted with the 2026-07-16 convergence attestation and the existing ADR-0030
HITL boundary. This decision changes only version accounting; npm mutation
still requires the separate final approval in #103.
