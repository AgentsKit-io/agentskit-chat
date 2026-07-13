# Changelog

## 0.2.0 — 2026-07-13

AgentsKit Chat now ships the trusted Ask backend vertical required by public
Docs, Registry, and Playbook hosts.

- Adds a versioned Ask request, trusted site configuration, grounded sources,
  usage, CAS sessions, typed diagnostics, and privacy-safe metrics.
- Validates deterministic escalation before any backend request and preserves
  resumable session identity without allowing clients to select a corpus.
- Adds injectable local and federated retrieval plus provider generation,
  citation enforcement, deadlines, cancellation, rate limits, and safe errors.
- Documents hosted and self-hosted deployments with executable tests for
  authority, prompt injection, persistence, conflict, timeout, and streaming.
- Recognizes valid Ask NDJSON served with an incorrect `text/plain` content
  type while preserving the safe fallback for ordinary text responses.
- Preserves the fixed 12-package graph and all seven native renderer gates.

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
