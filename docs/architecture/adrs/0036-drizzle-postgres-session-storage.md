# ADR-0036: Drizzle/Postgres application session envelopes

Status: Accepted for implementation by the CH-B coordinator, 2026-10-06; parent evidence review pending.

## Decision

Expose `@agentskit/chat/drizzle-pg` as an optional Drizzle peer subpath. Store only the existing versioned application SessionSnapshot in `agentskit_chat_sessions`, keyed by `(tenant_id, session_id)`. Insert uses ON CONFLICT DO NOTHING; updates compare the cursor column in the same SQL UPDATE and return whether one row changed. A replacement must advance the cursor. Existing session code owns SessionConflictError, leases and the HTTP 409 mapping; the adapter does not create parallel lifecycle semantics.

The host supplies a Drizzle node-postgres database: Node may use a pool, Workers use a request-scoped pg Client and close it in waitUntil after stream consumption. No Neon, Cloudflare bindings, DO or D1 are required by the adapter. SQL DDL is explicit, not run on import. Abort signals reject before dispatch; pg statements already in flight are not cancelled, and committed writes return their actual CAS result.

## Upstream boundary

ADR-0002 and ADR-0011 remain binding. Canonical messages stay in upstream ChatMemory. A general ChatMemory Drizzle backend is absent upstream and must land there before adoption; this subpath does not implement it. No core source is copied or imported privately. Existing SessionStorage and SessionSnapshot contracts are reused unchanged.

## Consequences

Tenant scope is supplied from trusted host authentication and applied to every query. Application isolation does not replace database RLS. The fixed table name keeps the public surface small; migrations remain the host's responsibility. PostgreSQL is the shared durable authority across pool connections and Worker isolates.
