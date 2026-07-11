# ADR-0003: Framework-neutral semantic fallback envelope

**Status:** Accepted

**Date:** 2026-07-11

## Context

ADR-0001 requires portable components to share semantic fallbacks while allowing each renderer to use native visual primitives. The first Ink slice needs a stable text representation before the component registry is introduced.

Defining the fallback format in the Ink package would make application behavior renderer-specific. Accepting unchecked values would also violate the runtime-validation boundary.

## Decision

`@agentskit/chat` owns a minimal, runtime-validated semantic fallback envelope with two non-empty strings: `kind` identifies the unsupported visual and `summary` preserves its human-readable meaning.

The shared formatter produces `[unsupported visual: <kind>] <summary>`. Native renderer packages may expose components that present this shared value, but they do not redefine its schema or formatting.

The future component registry may associate this envelope with component manifests. It must reuse or compatibly version this contract rather than create a renderer-specific alternative.

## Consequences

- Fallback meaning and text remain identical across renderers.
- Untrusted fallback values are validated before rendering.
- Ink owns only native terminal presentation.
- The contract is intentionally small and does not pre-empt component registry identity, props, or actions.
