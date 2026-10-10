# ADR-0038: Referenced parts are delivered at the adapter boundary

**Status:** Proposed. Completes the delivery left open by [ADR-0035](./0035-referenced-turn-parts-and-upload-policy.md).

## Context

ADR-0035 added reference parts to protocol v1 and a host-owned upload policy, and stopped at 501
`TURN_PARTS_UNAVAILABLE` because the published `ChatController.send` took only a string. The pending Core 1.15 release
accepts `send(string | ContentPart[])` and the adapters serialize image and file parts per provider.
ADR-0035 named two things to settle before enabling delivery: a signed URL expires while the
transcript is kept and replayed, and a validated object can be overwritten afterwards.

## Decision

The handler verifies the references of a submission as before, then calls the upstream
`controller.send` with core parts whose `source` is the opaque reference
(`tenantId/sessionId/uuid`). Image MIME types become `image` parts; everything else becomes `file`
parts. The transcript, the memory record and every snapshot carry the reference only. No signed URL
and no bytes are stored or sent to the client.

The reference is exchanged at the adapter boundary. When an upload policy is configured, the handler
wraps the definition's adapter with `deliverUploadParts`. On every model call the wrapper rewrites,
in the request it forwards, each part whose source is a reference in the authorized tenant and
session scope:

- `delivery: 'url'` (default): a GET URL signed by `BlobStore.presignGet` for the policy's
  `expiresIn` (300 s by default, 600 s at most);
- `delivery: 'bytes'`: the object's bytes as a `data:` URL, read with the policy's `maxBytes` limit,
  for providers that cannot fetch a URL. `maxBytes` bounds each file; optional `maxTotalBytes` bounds
  the total raw bytes per model call, including history (default: ten times `maxBytes`, capped at
  the largest safe integer). Exceeding either limit fails before adapter dispatch.

Because the exchange happens per model call, earlier turns replayed from the transcript get a fresh
URL each time, including the resume after `client.action.decide`. Sources outside the scope pass
through untouched; the wrapper never signs a reference of another tenant or session.

A server with an upload policy advertises `turn-parts-v1` in the first snapshot. A server without
one keeps answering 501 `TURN_PARTS_UNAVAILABLE`. An adapter that declares
`capabilities.multiModal === false` is refused with 422 `TURN_PARTS_UNSUPPORTED` before any model
call when the submission has file parts; parts are never flattened to text by the handler.

## Upstream adoption

Inspected `AgentsKit-io/agentskit` at `88722d4d`: `packages/core/src/controller.ts` (`send`),
`types/content.ts` (`ContentPart`, `partsToText`), `types/adapter.ts` (`AdapterFactory`,
`AdapterCapabilities`), and `packages/adapters/src/content-parts.ts` (accepted source forms: `data:`
and `http(s)` URLs). Reused exports: `createChatController`, `controller.send`, `ContentPart`,
`Message`, `AdapterFactory`. Local application behavior: the mapping from protocol reference parts
to core parts, the adapter decorator that exchanges references, the capability advertisement and the
HTTP status mapping. The decorator composes the upstream adapter contract; it does not reimplement
the controller, an adapter, or provider serialization. Linked upstream work: agentskit#1826 (parts in
adapters) and #1828 (`send` with parts), both unreleased when this was written.

## Consequences

- The upload scope callback (`uploads.tenantId`) now runs on every turn of a server that configures
  uploads, including text turns and decisions, because any earlier turn may hold a reference.
- A stored object is verified (size, MIME, SHA-256) when it is submitted, not again on later
  deliveries. A host that needs that guarantee over time must make uploaded objects immutable
  (versioned bucket or write-once keys); a still-valid signed PUT can otherwise replace the object.
- `delivery: 'bytes'` reads every referenced object again on each model call. Keep `maxBytes` and `maxTotalBytes`
  conservative or prefer `'url'` where the provider supports it.
- An object that disappears before delivery fails the turn (`CHAT_TURN_FAILED`); the model is not
  called with a partial request.
- Text-only adapters that ignore `parts` still see the upstream text projection of the message,
  which names the reference.
- Exercised with a fake store and adapter, and with a real S3-compatible store where the
  environment provides one. R2, MinIO and a real provider call are not certified by this change.

Adapters may be frozen objects or classes with private state. Each decorator uses a separate proxy target, forwarding property access and calls to the original adapter to preserve receivers without violating frozen-property invariants.
