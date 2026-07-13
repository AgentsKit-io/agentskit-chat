# ADR-0020: Public alpha artifacts enable external dogfood

**Status:** Accepted

**Date:** 2026-07-13

## Context

The Docs, Registry, and Playbook dogfood migrations run in repositories outside AgentsKit Chat. ADR-0002 forbids private source imports and unpublished workspace paths, while the complete stable v0 publication remains gated by dogfood and conformance work in issue #30. The repository has no npm publishing credential yet.

## Decision

AgentsKit Chat publishes `v0.1.0-alpha.0` as an immutable GitHub prerelease containing npm-compatible tarballs for the minimum Web dogfood graph:

- `@agentskit/chat-protocol`;
- `@agentskit/chat`;
- `@agentskit/chat-react`;
- `@agentskit/chat-server`.

All four manifests carry the same prerelease version, and pnpm rewrites their `workspace:*` edges to that version when packing. Release assets are built from the reviewed tag commit, accompanied by SHA-256 checksums, and installed by external dogfood hosts through pinned public asset URLs plus lockfile integrity. A clean-room install and production build prove that no workspace path is required.

This channel is supported for dogfood compatibility only. Issue #30 still owns the complete renderer matrix, npm provenance/trusted publishing, stable compatibility policy, public v0 documentation, and stable tags.

## Alternatives considered

1. Import source across repositories — rejected by ADR-0002 and because it would make dogfood privileged.
2. Move issue #30 before dogfood — rejected because the stable release criteria explicitly require dogfood evidence.
3. Publish directly to npm from a developer machine — rejected because no authenticated provenance path exists and local credentials must not be introduced.
4. Copy or bundle framework code into each host — rejected as reimplementation and a future upgrade fork.

## Consequences

- External hosts consume a public, immutable, reviewable framework artifact before stable v0.
- Alpha consumers must pin release assets and deliberately upgrade.
- Only the Web graph is promised by this prerelease; other renderers remain workspace-tested until #30.
- The alpha does not weaken or pre-approve the stable release gates.
