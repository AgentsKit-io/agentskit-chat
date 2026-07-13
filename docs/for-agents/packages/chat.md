# Chat package handoff

## Ownership

`packages/chat` owns framework-neutral application definitions, the closed component manifest, component props validation, and the semantic fallback API from ADR-0003/ADR-0007. `ChatDefinition.chat` is the upstream `ChatConfig`; do not mirror its fields or add a controller.

## Read first

- [`../../architecture/upstream-adoption.md`](../../architecture/upstream-adoption.md)
- [`../../architecture/adrs/0002-upstream-first-no-reimplementation.md`](../../architecture/adrs/0002-upstream-first-no-reimplementation.md)
- [`../../architecture/adrs/0003-semantic-fallback-envelope.md`](../../architecture/adrs/0003-semantic-fallback-envelope.md)
- [`../../architecture/adrs/0006-session-scoped-deterministic-conversation.md`](../../architecture/adrs/0006-session-scoped-deterministic-conversation.md)
- [`../../architecture/adrs/0007-closed-application-component-manifest.md`](../../architecture/adrs/0007-closed-application-component-manifest.md)
- [`../../components/choice-list.md`](../../components/choice-list.md)
- [`../../conversation/routes-and-state.md`](../../conversation/routes-and-state.md)
- [`../../protocol/ask-service.md`](../../protocol/ask-service.md)
- [`../../architecture/adrs/0022-shared-ask-service-integration.md`](../../architecture/adrs/0022-shared-ask-service-integration.md)
- [`../../architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md`](../../architecture/adrs/0023-conversation-transitions-use-agentskit-statechart.md)
- [`../../protocol/deterministic-answers.md`](../../protocol/deterministic-answers.md)
- [`../../architecture/adrs/0024-deterministic-answer-plane.md`](../../architecture/adrs/0024-deterministic-answer-plane.md)

## Conversation boundary

`createChatSession` may wrap only the upstream adapter boundary. It must not consume streams, mutate controller state, execute tools, or persist messages. Route precedence is declaration order; transition targets come from the active state definition. Every renderer creates a fresh session per definition mount.

Conversation declarations compile to `@agentskit/statechart`. Use its published definition, immutable instance, and transition contracts; do not recreate generic state validation or transition assignment locally. This package retains only application route matching, adapter fallback, actions, traces, decision replay, and the existing session projection.

`resumeChatSession` persists only the application envelope described by ADR-0011. Canonical messages must remain in upstream `ChatMemory`. Validate stored snapshots before hydration, bind them to session + definition revision, and keep terminal confirmations terminal.

Deterministic route callbacks receive stable session/message identity per ADR-0018. Component-producing routes derive instance IDs from the message identity; never use definition-global counters or constant IDs for repeatable interactive routes.

## Component boundary

Model or route frames are untrusted. Resolve them against `definition.components`; unknown or invalid frames are inert. Selection events express intent only and never execute an action. Standard AgentsKit `UIElement` types remain upstream.

The standard application catalog is defined in `src/catalog.ts`. Every entry must ship schema, declared events, accessibility, capabilities, fallback, shared fixture, seven native presentations, and a regenerated parity report. Generic interactions remain intent-only; do not execute navigation, downloads, approvals, or tools in the catalog contract.

Actionable choices use `createActionConfirmation` and the released upstream `ChatReturn.proposeToolCall`. Never validate or execute tools locally. Confirmation handles bind application-session metadata; authentication and durable audit remain outside this package.

Authorization uses `createCapabilityPolicy` + `withActionPolicy`. Trusted context must come from a host closure, never a protocol frame or message. AgentsKit owns enforcement through `authorizeToolCall`; this package owns only capability composition and trace projection.

## Ask service boundary

Docs, Registry, and Playbook must consume `createAskAdapter` and `createAskSessionMemory`. Do not recreate the Ask schema, NDJSON decoder, fetch loop, citation projection, or browser message store in a host. Host-specific visual tools may use `projectTool`, but the returned component frame remains runtime validated. Use a new canonical storage key and pass prior formats through `legacyKeys`.

## Deterministic answer boundary

`createDeterministicAnswerResolver` performs only normalized whole-query equality over a validated artifact. Do not add fuzzy, prefix, semantic, embedding, or model matching. `createDeterministicAnswerAdapter` may decide locally or delegate to an injected upstream `AdapterFactory`; it must not consume the backend stream, replace cancellation, or implement another controller. Corrupt artifacts are rejected at the protocol boundary, stale artifacts escalate, and missing fallback becomes an offline response. The public contract is accepted by ADR-0024 with HITL approval recorded on 2026-07-13.

## Checks

```bash
pnpm --filter @agentskit/chat lint
pnpm --filter @agentskit/chat test
```
