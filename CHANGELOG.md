# Changelog

## 0.4.0 — 2026-07-15

AgentsKit Chat can now present sessions owned by an existing host without
creating a second controller or session store.

- Adds a framework-neutral, runtime-validated controlled-session driver with
  host callbacks for input, send, cancel, retry, edit, regenerate, approval,
  denial, and component interaction.
- Adds controlled mode to the React and Ink renderers while preserving their
  existing definition-owned mode and shared presentation behavior.
- Keeps transport, authentication, authorization, persistence, and product
  actions outside the public framework boundary.
- Adds synthetic conformance fixtures for idle, streaming, error,
  cancellation-ready, confirmation, and semantic-component states.
- Preserves the two-package public graph, seven renderer subpaths, protocol v1,
  and compatibility with applications using the 0.3 definition-owned APIs.

## 0.3.0 — 2026-07-14

AgentsKit Chat consolidates its public npm surface from twelve packages to two
without collapsing the internal framework-specific ownership boundaries.

- Publishes protocol, server, devtools, React, React Native, Ink, Vue, Svelte,
  Solid, and Angular APIs as explicit `@agentskit/chat/*` subpaths.
- Keeps every renderer's native compilation, peer dependencies, conformance,
  accessibility, and bundle budget isolated inside the monorepo.
- Updates the CLI, examples, Fumadocs dogfood, public guides, and executable
  README fixtures to install the consolidated package graph.
- Adds release gates that verify exactly two public packages, all seven
  renderer exports, clean installation, checksums, and npm provenance.
- Preserves the former package names as the immutable `0.2.x` compatibility
  line; applications migrate imports using the documented subpath mapping.

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
