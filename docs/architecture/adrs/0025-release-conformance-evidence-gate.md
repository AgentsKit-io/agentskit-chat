# ADR-0025: Release conformance is a versioned evidence gate

**Status:** Accepted

**Date:** 2026-07-13

## Context

AgentsKit Chat supports seven native renderer packages. Shared protocol fixtures, standard-component support declarations, renderer tests, browser E2E, and Ink PTY tests already exist, but release automation cannot currently explain which renderer, component, event, or platform requirement drifted. A passing package test command alone is not a published compatibility promise, and a generated parity table alone does not prove interaction or accessibility behavior.

## Decision

The repository owns one versioned, runtime-validated conformance manifest. It distinguishes universal requirements from DOM, native-mobile, and terminal requirements and maps every renderer to executable evidence.

A repository-level conformance gate validates the manifest, compares every renderer support declaration with the standard component catalog, verifies required evidence files, and emits stable findings containing a code, renderer, optional component or event, and remediation. Meta-tests use synthetic broken manifests and support declarations to prove that diagnostics identify the exact failure.

The generated public matrix is derived from the same manifest and standard catalog used by the gate. It is documentation, not a second source of truth.

Graphical renderer suites remain responsible for native semantic roles, accessible names, live/error announcements, interaction state, and framework lifecycle behavior. Ink remains responsible for readable semantic fallback, keyboard interaction, Escape cancellation, and graceful process exit through its PTY suite. The gate orchestrates this existing evidence; it does not implement a cross-framework renderer, accessibility engine, or test runner.

Pull-request CI runs the conformance gate and relevant package/platform suites. Release workflows run the same gate before packaging or publication.

## Alternatives considered

1. Treat the generated catalog table as the gate — rejected because a list of supported components does not prove accessibility or interaction evidence.
2. Build a shared virtual renderer — rejected because it would erase native semantics and duplicate the framework bindings owned by AgentsKit.
3. Require only manual accessibility review — rejected because semantic drift would not block releases.
4. Put the gate in AgentsKit — rejected because this matrix describes AgentsKit Chat application components, renderer packages, examples, and release policy rather than a reusable AgentsKit primitive.

## Consequences

- Release failures identify the renderer and remediation instead of failing as an opaque aggregate test.
- Universal and platform-specific promises are public and reviewable.
- Adding a renderer, component, event, or exception requires updating one validated manifest and executable evidence.
- Exceptions must be explicit, scoped, owned, and documented; missing evidence fails closed.
- The gate remains application-framework orchestration over AgentsKit packages and native renderer tests.

## Upstream adoption

Inspected the public AgentsKit core generative-UI contract and React, React Native, Vue, Svelte, Solid, Angular, and Ink bindings already consumed by the corresponding AgentsKit Chat renderers. AgentsKit continues to own controller lifecycle, framework bindings, confirmation, and portable generative UI. This decision adds only application-catalog conformance evidence and repository release orchestration. No upstream primitive is copied or reimplemented, and no generic upstream gap blocks the work.
