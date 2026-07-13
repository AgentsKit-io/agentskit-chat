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

Applications should pin a minor line (`^0.1.0` for this release), commit their
lockfile, run renderer conformance and host E2E before upgrades, and review both
the changelog and migration guide. Alpha GitHub tarball consumers should follow
[the alpha migration](./migration-from-alpha.md).
