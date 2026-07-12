# ADR-0015: Closed standard application component catalog

**Status:** Accepted

**Date:** 2026-07-11

## Context

ADR-0007 established a closed application component manifest while AgentsKit retained ownership of the portable `UIElement` union. A cross-framework baseline now needs richer application semantics—forms, approvals, progress, sources, tables, attachments, and status notices—without extending or copying upstream generative UI.

## Decision

`@agentskit/chat` publishes 12 immutable component definitions. Each definition owns a strict props schema, declared interaction names and value shape, accessibility contract, capability list, and semantic fallback builder. Custom definitions remain source compatible because catalog metadata is optional outside the standard catalog.

`@agentskit/chat-protocol` adds the v1 `interact` event beside the existing ChoiceList `select` event. The closed manifest validates the frame and declared event before an interaction is emitted. Display-only components declare no events. Interactions express intent; authorization, confirmation, navigation, downloads, and other effects remain host responsibilities.

Every native renderer exposes one generic standard-component surface plus its existing specialized ChoiceList. Renderer support declarations generate the parity report and conformance fixtures exercise every entry.

## Alternatives considered

1. Extend AgentsKit `UIElement` — rejected because application workflows and events are outside its small portable presentation union.
2. Twelve independent APIs per renderer — rejected because it multiplies public surface and drift.
3. Treat every component as formatted text — rejected because forms, tables, progress, alerts, and controls require native accessibility semantics.

## Consequences

- Schemas and events remain framework-neutral and runtime validated.
- Visual implementations stay native while parity is mechanically checked.
- Hosts own effects triggered by interaction events.
- A new standard component requires catalog metadata, fixtures, all renderer presentations, documentation, and parity regeneration in one change.
