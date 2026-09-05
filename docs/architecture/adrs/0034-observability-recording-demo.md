# ADR-0034: Observable incident demo composes AgentsKit

Status: Accepted for implementation by the speaker, 2026-09-04.

## Contract

Implement `/demo/agent-observability` in the documentation application for the
Conf42 recording. English, fictional Checkout API incident, no credentials,
no LLM requests, no production actions. A geometric investigation console uses
the existing product typography and violet identity, restrained semantic colors,
an interactive execution timeline and a host-owned approval pause.

Acceptance criteria:

- DEMO-01: Both deterministic and scripted-agent paths execute AgentsKit tools,
  expose context versions, decisions, tool inputs/results, validation, timeout,
  bounded retry and fallback. Integration tests and real-browser flows.
- DEMO-02: Rollback cannot execute before approval; reject ends safely. Repeated
  approval, reset during execution, fresh run IDs and retries are tested.
- DEMO-03: Trace inspection/export, replay, pause and pace controls work. No model
  usage/cost is invented; no network/provider calls in the fixture execution.
- DEMO-04: Real-browser tests at 375, 768, 1280, 1440 and 1920 widths; keyboard,
  axe accessibility/contrast, overflow, reduced motion, screenshots, console and
  failed requests. Human visual approval remains required.
- DEMO-05: Source and rehearsal instructions document the adapter seam and a
  one-line substitution of an already-configured provider. Typecheck, build and
  existing repository checks remain required.
- DEMO-06: Deploy to the existing AgentsKit Chat Vercel project and exercise the
  remote route, approval and replay. No real rollback or organizer uploads.

Budget: deterministic local checks first, zero paid model requests; one preview
deployment after local acceptance, repair deployments only when necessary.
Tracking: issue and PR authorized by speaker; no automatic merge. Preserve the
pre-existing `.doc-bridge/report.html` and `.doc-bridge/workflow/` artifacts.

## Upstream adoption

Inspected installed `@agentskit/core` ChatController, AdapterFactory,
ToolDefinition and Observer exports; `packages/chat/src/index.ts`
createActionConfirmation and defineChat; ADR-0002 and ADR-0008.
Reuse createChatController for tool execution, proposal and approval, and
createActionConfirmation for single-use, session-bound approval. Compose
defineChat for the configuration. No copied runtime or custom tool executor.

The application owns fictional fixtures, a fixed runbook, a scripted adapter,
safe evidence projection and playback pacing. Its timeline is an application
trace, not an OpenTelemetry exporter. Adapter runtime events are not presented
as real model usage. Tool timing is measured and includes controlled pacing.

The demo runs locally in the browser; its approval demonstrates the host API,
not a production security boundary. A real provider belongs behind an
authenticated backend and production tools require server authorization.

## Alternatives

A static event animation would not prove execution. A custom agent loop would
duplicate AgentsKit. A live provider would undermine repeatability and the
explicit no-LLM recording constraint. All are rejected.

## Verification and delivery

Preserve the strict project gates and add demo-specific tests. Repository
completion requires the verification harness, explicit visual approval and
remote evidence. Code readiness is not deployment readiness.
