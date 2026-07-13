# Alpha dogfood channel

`v0.1.0-alpha.0` is the public artifact channel used by the external Docs, Registry, and Playbook migrations before stable v0.

The GitHub prerelease contains npm-compatible tarballs and `SHA256SUMS` for `@agentskit/chat-protocol`, `@agentskit/chat`, `@agentskit/chat-react`, and `@agentskit/chat-server`. Consumers pin the immutable release asset URLs in their package manifest and lockfile. They must not import this repository's source or a local workspace path.

The tag workflow verifies that the tagged commit belongs to `main`, installs from the committed lockfile, runs lint, test, build, and doc-bridge gates, packs the four-package graph, verifies its manifests and checksums, and exercises ESM, CJS, and a production Vite build in a clean-room consumer. It uploads a draft, verifies the complete asset set, and only then publishes with the repository-scoped GitHub token. GitHub Immutable Releases is enabled for this repository. No npm credential is used.

This is intentionally narrower than the stable v0 release. See [ADR-0020](../architecture/adrs/0020-public-alpha-dogfood-channel.md) and [issue #30](https://github.com/AgentsKit-io/agentskit-chat/issues/30) for the remaining all-renderer, provenance, compatibility, documentation, and npm publication gates.
