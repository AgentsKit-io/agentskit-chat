# Release conformance

AgentsKit Chat publishes one compatibility promise across React, React Native, Vue, Svelte, Solid, Angular, and Ink. The versioned source is [`conformance/manifest.json`](../../conformance/manifest.json); the readable matrix is generated from it.

## What the gate proves

- Universal evidence covers the shared turn protocol, all standard components and events, safe diagnostics, and lifecycle controls.
- DOM evidence covers roles, accessible names, announcements, and keyboard interaction.
- React Native evidence covers native accessibility roles, labels, state, and touch interaction.
- Ink evidence covers readable output, keyboard flows, Escape cancellation, and graceful exit in a PTY.

Run `pnpm conformance:gate` to validate declarations and committed evidence. Run `pnpm test:conformance` to verify that deliberately broken fixtures report stable renderer, component, event, and requirement diagnostics. Run `pnpm conformance:report` after an intentional manifest change.

## Contributor workflow

When adding or changing a renderer, component, event, or platform behavior:

1. Implement the behavior through the native AgentsKit binding; do not copy an upstream controller or protocol.
2. Add executable evidence in the owning renderer or example suite.
3. Update the renderer's `catalog-support.json` and `conformance/manifest.json`.
4. Regenerate the matrix and run the conformance, renderer, E2E, and PTY checks that apply.

The gate fails closed if its manifest, support declaration, evidence path, generated report, or exception is invalid.

## Exception policy

An exception is a temporary release decision, not an implicit unsupported state. It must name one renderer and requirement, explain the reason, identify an owner, and have an ISO date expiry. Expired exceptions fail the gate. Permanent differences belong in a platform-specific requirement or an ADR.

See [ADR-0024](../architecture/adrs/0024-release-conformance-evidence-gate.md) for the architectural boundary and [the generated matrix](./matrix.generated.md) for current evidence.
