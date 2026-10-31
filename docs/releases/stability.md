# v0 stability and upgrades

AgentsKit Chat follows SemVer as a fixed package group.

- Patch releases preserve public TypeScript signatures, protocol versions,
  component/event meaning, and persisted session compatibility.
- During `0.x`, a minor release may change a public contract, but only with an
  RFC or ADR as required, a changelog entry, a migration guide, and conformance
  evidence for all affected renderers.
- Protocol v1 payloads remain runtime validated. A breaking wire change uses a
  new protocol version and an explicit decoder/migration path.
- Deprecated APIs remain for at least one subsequent minor release unless a
  security issue makes that unsafe.
- AgentsKit peer minimums change only after upstream-first inspection and the
  full release matrix. No upstream implementation is copied downstream.

Applications should pin a minor line (`^0.7.0` for this release), commit their
lockfile, run renderer conformance and host E2E before upgrades, and review both
the changelog and migration guide.

## Migration guides (repository)

Maintainer migration notes live in the monorepo (not every path is on the
public product site):

- [0.2 migration](https://github.com/AgentsKit-io/agentskit-chat/blob/main/docs/releases/migration-to-0.2.md)
- [Alpha → stable migration](https://github.com/AgentsKit-io/agentskit-chat/blob/main/docs/releases/migration-from-alpha.md)
- [0.3 package consolidation](https://github.com/AgentsKit-io/agentskit-chat/blob/main/docs/releases/migration-to-0.3.md)

Applications upgrading to `0.7.0` must pass an explicit `endpoint` to
`createAskAdapter`; there is no hosted default. `@agentskit/chat` now depends on
`@agentskit/eval ^0.7.0`, `@agentskit/memory ^0.12.0` and
`@agentskit/statechart ^0.3.2`, and keeps the `@agentskit/core ^1.15.0` peer
introduced in `0.6.0`.

See [Compatibility](/docs/releases/compatibility) and
[0.7 release notes](./v0.7.0.md) for integration constraints.
