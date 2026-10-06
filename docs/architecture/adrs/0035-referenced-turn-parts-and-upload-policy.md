# ADR-0035: Additive referenced turn parts and host-owned upload policy

**Status:** Proposed; implementation scope approved by the coordinator on 2026-10-06.

## Decision

Extend protocol v1 additively with text/file-reference inputs and optional snapshot
capabilities. Clients must echo `turn-parts-v1`; the server may advertise it only when
the supported upstream controller can preserve parts through dispatch. Current
snapshots advertise no capabilities. Validated reference submissions fail explicitly
with 501; string turns keep their upstream lifecycle and 64 KiB request boundary.

Uploads are application policy: a host-authorized metadata endpoint signs direct
storage PUTs through a BlobStore port. The chat JSON never carries file binaries.
References are bound to trusted tenant/session identifiers, checked before storage
reads, and verified against actual MIME, byte count and SHA-256. SigV4 is provided by
aws4fetch, already present in the dependency graph, not a custom signer. PUT length
and MIME headers are signed; signed URLs expire within ten minutes.

BlobStore's short signed GET is the future adapter handoff seam. This change neither
persists nor hands GET URLs to core. A future upstream adoption change must consider
URL expiry during memory/retry and concurrent overwrite of a previously validated
object before enabling delivery; immutable/versioned objects may be needed.

## Upstream adoption

Inspected installed `@agentskit/core` exports and controller implementation, and
read-only CH-A `packages/core/src/types/chat.ts`, `controller.ts`, `types/content.ts`.
`ContentPart` and `Message.parts` exist, but `ChatController.send(text: string)` calls
`text.trim()` and constructs a text-only user message. The coordinator confirmed no
published version accepts parts. Existing `createChatController`, session resume,
claim/release and @agentskit/net bounded JSON/timeouts remain reused without copying.

The missing framework-neutral send API belongs upstream under ADR-0002. CH-A source
was not copied, linked or consumed. Tracking/publication is owned by the coordinator;
no upstream issue link was supplied, and external issue creation/publication is
forbidden in this dispatch. Enabling capability remains blocked on that tracked,
published upstream change and a real adapter-delivery acceptance flow.

## Consequences

No breaking v1 field changes. Hosts own authentication, session authorization,
bucket CORS, storage credentials and abandoned-upload lifecycle. Checksums buffer
at most `maxBytes`; large-file incremental hashing is deferred. Real local SeaweedFS
and workerd exercise the reference flow; this is not R2/S3 production certification.
