# ADR-0012: Web-standard snapshot handler

**Status:** Accepted

**Date:** 2026-07-11

## Context

AgentsKit Chat definitions need one portable server boundary for Node, serverless, and edge hosts. AgentsKit already owns the controller, adapters, stream consumption, tools, message memory, and cancellation. The application protocol already defines complete snapshots and safe diagnostics.

## Decision

`@agentskit/chat-server` exposes `createChatHandler`, returning `(Request) => Promise<Response>`. It accepts validated `client.turn.submit` events and streams newline-delimited, encoded `server.turn.snapshot` events using Web `ReadableStream`.

Authentication runs before body parsing. Its host-owned context is passed only to definition and storage resolvers; client fields cannot populate it. The handler loads and saves messages through upstream `ChatMemory`, resumes application metadata through CAS `SessionStorage`, creates the upstream `ChatController`, observes canonical state, and projects snapshots with the existing protocol helper. It never transports raw `StreamChunk` or creates another reducer.

Persistent storage is required. Before controller creation, the handler claims an expiring active-turn lease through session CAS, rejecting concurrent work before any model or tool side effect. A bounded terminal-turn history rejects recent sequential replay and distinguishes completed work from an indeterminate memory-save outcome. The lease covers the request plus every bounded cleanup phase. Cleanup settles the controller, durably saves canonical messages, and releases the lease after request abort or response cancellation, including when response backpressure prevents another pull. Pending full snapshots are coalesced under backpressure.

The request signal is combined with `AbortSignal.timeout`. Authentication, definition resolution, session load, message load, and the active turn share that deadline. Abort calls `controller.stop()`; stream cancellation also stops the controller. Boundary failures return safe versioned JSON diagnostics, and active-turn timeout/cancellation is represented by a safe diagnostic event.

## Alternatives considered

1. Framework-specific Next/Express handlers — rejected because the Web contract already runs across target hosts.
2. Stream adapter chunks directly — rejected by ADR-0004 because clients would need another lifecycle reducer.
3. Add a custom message store — rejected because AgentsKit `ChatMemory` owns canonical history.
4. Bundle authentication — rejected because identity and tenancy are host concerns.

## Consequences

- Host adapters are thin request bridges.
- Full snapshots use more bandwidth than deltas but retain deterministic reconnect behavior.
- Hosts must provide atomic CAS session storage when persistence is enabled.
- The 64-turn dedupe window is application replay protection, not crash-proof exactly-once execution; side-effecting tools that require stronger guarantees still need their own durable idempotency key or transactional outbox.
- Provider-specific resilience remains inside the selected AgentsKit adapter; the handler enforces the outer request deadline and cancellation boundary.

## Upstream adoption

Inspected AgentsKit Core controller, adapter, stream, chat, and memory contracts plus published Memory adapters. Reused `createChatController`, `ChatMemory`, canonical state/messages/tool calls, and `StreamSource.abort`. The cancellable `ChatMemory` seam was added upstream by AgentsKit #1155/#1156 and released in Core 1.12.2 before integration. Added locally only the Web application boundary, trusted-context composition, active-turn application lease, and protocol projection; no upstream source or behavior is copied.
