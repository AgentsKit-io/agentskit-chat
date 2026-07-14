# ADR-0027 — Public package consolidation

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

AgentsKit Chat was implemented as twelve workspace packages and published every
workspace boundary to npm. Protocol, server, and devtools are implementation
modules of the Chat application layer, not independently versioned products.
Publishing them separately adds release, provenance, documentation, and consumer
dependency-graph overhead without providing an independent compatibility policy.

Framework renderers remain separate because each has distinct runtime and peer
dependencies. The CLI remains separate because it owns an executable binary.

## Decision

`@agentskit/chat` is the single public package for shared Chat behavior. It
publishes these subpaths from one versioned tarball:

- `@agentskit/chat/protocol`
- `@agentskit/chat/protocol/fixtures`
- `@agentskit/chat/server`
- `@agentskit/chat/devtools`

The `protocol`, `server`, and `devtools` workspace packages remain internal
modules with `private: true`. Renderer packages depend only on `@agentskit/chat`.
Release automation must pack and verify the aggregated artifact and must not
publish private workspace packages.

Previously published package names receive deprecation releases directing users
to the corresponding subpath. Existing versions are not unpublished.

## Consequences

- The Chat npm surface drops from twelve packages to nine immediately.
- Internal ownership and focused tests remain intact.
- Shared Chat modules use one semver line and one provenance artifact.
- Consumers migrate imports but do not need behavioral changes.
- Renderer packages remain public until their framework-specific peer dependency
  and release requirements can be evaluated independently.
