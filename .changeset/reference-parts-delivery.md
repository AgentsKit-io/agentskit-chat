---
"@agentskit/chat": minor
---

Deliver referenced parts to the model. A `client.turn.submit` with `{ type: 'file', ref, … }` parts now returns 200 on a server with an `uploads` policy: the handler verifies each reference and calls the upstream `controller.send` with image or file parts. The transcript and snapshots keep only the reference; `deliverUploadParts` exchanges it for a short signed GET URL (default) or for the object's bytes as a data URL (`uploads.delivery: 'bytes'`) on each model call, so replayed turns get a fresh URL.

Servers with an upload policy advertise `turn-parts-v1`. New typed failure: 422 `TURN_PARTS_UNSUPPORTED` when the adapter declares it is not multimodal. `uploads.tenantId` now runs on every turn of a server that configures uploads. New exports from `@agentskit/chat/server`: `deliverUploadParts`, `toContentParts`.

Separate per-file `maxBytes` from the optional per-model-call `maxTotalBytes` budget in bytes mode (default ten times the per-file limit), including replayed history. Preserve adapter receivers and support frozen adapters in session, metering, and upload decorators.
