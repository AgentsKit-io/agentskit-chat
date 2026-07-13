# Registry and Playbook dogfood migration

Issue [#27](https://github.com/AgentsKit-io/agentskit-chat/issues/27) moves the
existing Playbook Ask surface to AgentsKit Chat and adds the same shared surface
to the production Registry host. The Docs host was migrated in the same round
because it used another copy of the Ask protocol, transport, and memory logic.

## Ownership correction

The issue originally named an Astro Registry host. Registry RFC 0002 and
`AgentsKit-io/agentskit-registry@5d4fc56` superseded that premise: the Registry
repository is a data-only corpus and `registry.agentskit.io` is the Next app at
`AgentsKit-io/agentskit/apps/registry`. The migration therefore targets that
live app and deletes the unbuilt `src/components/AskWidget.astro` orphan from
the data repository. Astro is not reintroduced, so the Registry change is a new
surface in the live host rather than a migration of a live Astro application.

## Shared boundary

The live hosts pin the immutable `v0.1.0-alpha.2` tarballs for
`@agentskit/chat`, `@agentskit/chat-protocol`, and `@agentskit/chat-react`.
They compose supported `@agentskit/core` and `@agentskit/react` releases. The
release assets include SHA-256 checksums and passed the clean-room ESM, CJS,
Vite, tarball, and renderer verification in the release workflow.

AgentsKit owns controller lifecycle, messages, cancellation, retry, edit,
regenerate, and the web-storage memory primitive. AgentsKit Chat Protocol owns
the bounded Ask v1 event schemas and decoder. AgentsKit Chat owns `defineChat`,
the Ask streaming adapter, safe citation projection, session-memory migration,
ordered assistant content, the standard component manifest, `source-list`, and
`AgentChat`. Each host owns only:

- endpoint and `registry` or `playbook` corpus configuration;
- an optional presentation projector for host-specific tools (Docs only);
- canonical and legacy storage-key identities;
- native brand shell, linked prose, composer, loading copy, citations, and CTA.

Unknown events and tools are inert. Unsafe citation schemes are rejected,
source counts/titles/fallbacks are bounded, malformed or oversized records are
discarded safely, ordered content has cumulative limits, and connection setup
has a deadline composed with AgentsKit cancellation without timing out a valid
long-running response stream.

The reusable storage seam was fixed first in AgentsKit
[#1191](https://github.com/AgentsKit-io/agentskit/issues/1191) and
[PR #1192](https://github.com/AgentsKit-io/agentskit/pull/1192), then released
through [PR #1194](https://github.com/AgentsKit-io/agentskit/pull/1194) as
`@agentskit/memory@0.11.0`. The shared Ask integration was tracked in AgentsKit
Chat [#66](https://github.com/AgentsKit-io/agentskit-chat/issues/66), delivered
by [PR #67](https://github.com/AgentsKit-io/agentskit-chat/pull/67), and released
as [`v0.1.0-alpha.2`](https://github.com/AgentsKit-io/agentskit-chat/releases/tag/v0.1.0-alpha.2).

## Removed duplication

The former Registry Astro widget and Playbook React widget independently owned
message arrays, streaming flags, abort controllers, NDJSON loops,
`sessionStorage`, rendering, scrolling, errors, and stop behavior. After
parity, the orphan Astro file and the Playbook reducer/loop were removed. The
live Registry, Docs, and Playbook shells now delegate those responsibilities to
the framework/runtime. The data-only Registry repository also removed its
orphan Astro widget.

## Parity evidence

Protocol and integration conformance now live once in the shared packages: the
release ran 61 protocol tests and 81 chat tests, plus all seven renderer builds.
The consumer hosts retain strict typecheck and production-build evidence:
Playbook generated 266 pages, Registry generated 365 routes, and Docs generated
1,171 routes. Frozen lockfile installs prove that the hosts consume the
published tarballs rather than workspace substitutions.

Browser evidence covers 375, 768, 1280, and 1440 px. Panels remain inside the
layout viewport, all measured panel controls are at least 44 by 44 px, the
composer is labelled, send enables from keyboard input, and open/close/clear
semantics remain available. Opening focuses the composer, Escape closes the
dialog, and closing restores focus to the launcher. Mobile uses physical
`inset` edges instead of `100vw`/`100dvh`, avoiding scrollbar-dependent
fixed-panel overflow.

Host records:

- Docs migration: [AgentsKit #1184](https://github.com/AgentsKit-io/agentskit/pull/1184)
- Registry and Docs production adoption: [AgentsKit #1190](https://github.com/AgentsKit-io/agentskit/pull/1190)
- Playbook adoption: [Agents Playbook #12](https://github.com/AgentsKit-io/agents-playbook/pull/12)
- Data-only Registry cleanup: [AgentsKit Registry #75](https://github.com/AgentsKit-io/agentskit-registry/pull/75)
- Host documentation: `AgentsKit-io/agentskit/apps/registry/README.md` and
  `AgentsKit-io/agents-playbook/content/docs/agentskit-chat.md`

Private-consumer validation remains confidential. Its public release evidence
is limited to synthetic framework contracts, the seven-renderer conformance
matrix, reference applications, and privacy review; no private behavior or
business rule is part of this record.

## No-reimplementation check

Inspected AgentsKit `@agentskit/core@1.12.3`, `@agentskit/react@0.7.4`, and the
memory package before editing the hosts. The missing reusable web-storage seam
was implemented and released in AgentsKit itself. The duplicated Ask schemas,
decoder, transport, citation policy, and migration logic were moved to
AgentsKit Chat Protocol and AgentsKit Chat before host adoption. No controller,
reducer, memory engine, lifecycle, renderer, stream decoder, or component
protocol remains copied in a host. A host projector is presentation-only and
must consume the shared validated event type.
