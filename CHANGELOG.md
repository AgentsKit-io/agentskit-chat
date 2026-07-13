# Changelog

## 0.2.0 — 2026-07-13

- Adds a Web-standard trusted Ask backend contract for hosted and self-hosted
  deployments, with session-aware requests, deterministic escalation,
  validated retrieval boundaries, persistence, diagnostics, cancellation,
  rate-limit composition, and privacy-safe metrics.
- Keeps AgentsKit as the controller and lifecycle substrate while the shared
  adapter projects backend events into the canonical AgentsKit Chat model.
- Recognizes valid Ask NDJSON served with an incorrect `text/plain` content
  type without changing the safe fallback for ordinary text responses.
- Preserves the fixed 12-package graph and seven-renderer conformance gates.

See the [0.2 release notes](./docs/releases/v0.2.0.md) and
[0.1 migration guide](./docs/releases/migration-to-0.2.md).

## 0.1.0 — 2026-07-13

First stable v0 release of AgentsKit Chat.

- Defines one framework-neutral chat application contract over AgentsKit.
- Ships native React, React Native, Ink, Vue, Svelte, Solid, and Angular shells.
- Adds deterministic routes backed by `@agentskit/statechart`, typed actions,
  trusted capability policy, confirmation, session metadata, semantic themes,
  and a closed standard component catalog.
- Adds the versioned turn, component, ordered-content, Ask, and deterministic
  answer protocols with runtime validation.
- Adds a Web-standard server handler, seven-renderer CLI, replay/parity
  devtools, four reference applications, and public dogfood evidence.
- Enforces browser, native-mobile, terminal, accessibility, package,
  provenance, documentation, and clean-install release gates.

The `0.1.0-alpha.2` GitHub artifact channel remains immutable for existing
dogfood lockfiles. New installations should use the npm packages at `0.1.0`.
