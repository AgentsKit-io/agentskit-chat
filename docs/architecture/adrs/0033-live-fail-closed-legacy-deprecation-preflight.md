# ADR-0033: Require a live fail-closed deprecation preflight

## Status

Accepted — 2026-07-16

## Context

The deterministic adoption ledger can prove repository intent but cannot detect
that a referenced CI run later proved unsuccessful, an evidence URL disappeared,
or a new legacy package version was published after review. `npm deprecate @*`
would affect that new version, so a stale snapshot is unsafe.

## Decision

The legacy deprecation plan uses schema v2. Every package records the exact
audited `expectedLatest` dist-tag and complete `expectedVersions` set. Immediately
before HITL, a read-only live preflight must also:

- run the deterministic consumer-readiness evaluation;
- resolve each declared GitHub Actions run through the public API, bind it to the
  declared repository, and require `completed/success`;
- require public production and migration URLs to respond successfully;
- require every evidenced consolidated npm version and every replacement export;
- require each legacy packument to match the reviewed dist-tag and complete
  version set and contain no existing deprecation notice.

Any mismatch blocks the entire operation. The preflight never mutates npm.

## Consequences

- Publishing any legacy version invalidates approval and requires a reviewed
  plan update.
- A reachable CI HTML page is not treated as passing CI evidence.
- HITL remains mandatory after both deterministic and live gates report ready.
