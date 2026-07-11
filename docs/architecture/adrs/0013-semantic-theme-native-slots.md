# ADR-0013: Semantic application themes and native slots

**Status:** Proposed — HITL review required  
**Date:** 2026-07-11

## Context

AgentsKit Chat needs one visual intent across DOM, native, and terminal hosts without moving framework primitives into the shared definition or recreating AgentsKit UI bindings.

## Decision

`@agentskit/chat` owns a small runtime-validated semantic theme: colors, spacing, radius, and font family. Renderer packages translate it only through published AgentsKit seams:

- React maps to upstream `--ak-*` CSS custom properties and stable `data-ak-*` hooks.
- React Native maps to upstream `style` pass-throughs and native styles for application components.
- Ink maps supported colors to a complete upstream `InkTheme` and uses `InkThemeProvider`; spatial and typography tokens are intentionally unsupported by terminal capabilities.

Each renderer exposes native component slots for its container, message, input, thinking indicator, confirmation, and `ChoiceList`. Slots never enter the shared definition. Hosts needing fully headless state import the published `useChat` hook from their AgentsKit binding directly.

Default shells retain their documented accessibility and keyboard behavior. A host replacing a slot owns equivalent semantics.

## Alternatives considered

1. A universal component tree — rejected because it would leak DOM/React Native/Ink primitives into core.
2. A second headless chat hook — rejected because AgentsKit already owns `useChat`, state, lifecycle, and cancellation.
3. A local design system — rejected because AgentsKit already publishes CSS variables, native style seams, and Ink theming.

## Consequences

- One shared definition can be restyled without renderer conditionals.
- Mapping is capability-aware rather than pretending every platform supports every token.
- Slots remain idiomatic and type-safe per renderer.
- Replacing defaults transfers accessibility responsibility to the host.

## Upstream adoption

Inspected AgentsKit React theme CSS and component attributes, React Native component style/testID pass-throughs, and Ink `InkThemeProvider`/`InkTheme`. Reused all of them directly. Added only application token validation, mapping, and renderer-local slots. No upstream primitive or behavior is copied.
