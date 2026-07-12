# ADR-0016: Seven-renderer CLI and semantic component generation

**Status:** Accepted  
**Date:** 2026-07-11

## Context

The initial CLI supported React, React Native, and Ink. The framework now has seven native renderers and a closed semantic component catalog. Scaffolding must preserve one framework-neutral contract while allowing native presentation without turning the CLI into a second runtime or copying AgentsKit starters.

## Decision

The CLI owns a closed seven-value renderer enum used by detection, `init`, help, completion, and tests. `init` retains its staged atomic project promotion. `add component` accepts an explicit comma-separated renderer list, validates a portable component name, checks every destination before writing, and creates one strict Zod definition plus selected native source files.

Generated component definitions contain schema, semantic key, event metadata, accessibility, capabilities, and fallback. Native files contain presentation only. Hosts explicitly register the definition and connect native files through renderer slots.

## Alternatives considered

1. Generate from framework components — rejected because framework source is not portable or safely serializable.
2. Introduce a template engine — rejected because small deterministic strings and Node filesystem APIs cover the closed matrix.
3. Extend upstream AgentsKit scaffolds — rejected because upstream owns general AgentsKit starters, not AgentsKit Chat application composition.

## Consequences

- Detection and generated layouts are auditable as one closed matrix.
- Adding a renderer requires updating templates, golden tests, install/typecheck tests, help, and completion together.
- Component generation never edits a manifest automatically; explicit registration avoids unsafe source rewriting.
- Existing files cause refusal before writes; the command does not merge or overwrite.

## Upstream adoption

Inspected AgentsKit revision `978ce3d77be7bbf76094b5919d240e50091bc824`: `@agentskit/cli` exports `writeStarterProject`, `@agentskit/templates` exports `scaffold`, and `@agentskit/core/generative-ui` owns generic `UIElement` validation. This CLI composes published AgentsKit bindings and AgentsKit Chat contracts only. No upstream primitive is copied or reimplemented, and no upstream gap is required for this decision.
