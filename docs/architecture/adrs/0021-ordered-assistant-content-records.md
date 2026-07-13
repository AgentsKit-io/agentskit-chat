# ADR-0021: Ordered assistant content uses versioned JSON records

**Status:** Accepted

**Date:** 2026-07-13

## Context

An assistant turn may need to stream grounded prose and then present a portable application component such as `source-list`. AgentsKit correctly stores and streams canonical message content as a string. The existing AgentsKit Chat component envelope renders only when that complete string is one component frame. A host otherwise has to create a second timeline or renderer to combine prose and components, duplicating framework behavior.

The composition boundary must remain incremental, inert under untrusted model text, bounded, compatible with existing messages, and independent of any transport or controller implementation.

## Decision

`@agentskit/chat-protocol` defines `agentskit.chat.content/1`, an ordered record stream stored inside one canonical AgentsKit assistant-message string. The stream starts with a reserved record-separator prefix. Each following newline-delimited JSON record is either bounded text, encoded by the host through `createAssistantContentEncoder`, or an existing fully validated `ComponentRenderFrame`.

The encoder JSON-escapes text, so newlines, JSON, and protocol-like values from a model remain inert. The decoder exposes only complete records while a trailing record is still streaming and enforces UTF-8 total-byte, record-count, text, props, fallback, and frame bounds. Renderers may coalesce adjacent validated text records for native message presentation. Malformed complete records and unsupported versions produce fixed safe diagnostics. Renderers resolve every component through the existing closed manifest and semantic fallback rules.

Plain strings and whole-message component frames keep their existing behavior. The protocol does not replace AgentsKit messages, adapter chunks, controller state, cancellation, persistence, or transport.

## Alternatives considered

1. One JSON document containing all parts — rejected because incomplete JSON would expose transport text or defer all rendering until completion.
2. Raw textual delimiters — rejected because model output could inject delimiters and manufacture component records.
3. A host-owned parallel timeline — rejected because it duplicates canonical state, streaming, lifecycle, and renderer coordination.
4. Change AgentsKit `Message.content` to a custom union — rejected because ordered application components are an application-framework concern and AgentsKit already provides the correct canonical string and stream contracts.

## Consequences

- Grounded prose can visibly stream before a validated `source-list` in the same assistant turn.
- Hosts must encode every text chunk; concatenating raw model text to an envelope is invalid usage.
- A reserved record-separator prefix is no longer rendered as ordinary assistant text.
- Other native shells must adopt this protocol before stable cross-renderer parity is claimed by issue #30.

## Upstream adoption

Inspected AgentsKit Core `Message`, `StreamChunk`, controller, and framework bindings. Reused canonical string messages, adapter streaming, lifecycle, and renderer message primitives without modification. AgentsKit Chat adds only application-level ordering of its already-owned closed components. No generic AgentsKit gap or upstream reimplementation exists.
