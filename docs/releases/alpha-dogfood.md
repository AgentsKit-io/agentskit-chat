# Alpha dogfood channel

`v0.1.0-alpha.0` is the public artifact channel used by the external Docs, Registry, and Playbook migrations before stable v0.

The GitHub prerelease contains npm-compatible tarballs and `SHA256SUMS` for `@agentskit/chat-protocol`, `@agentskit/chat`, `@agentskit/chat-react`, and `@agentskit/chat-server`. Consumers pin the immutable release asset URLs in their package manifest and lockfile. They must not import this repository's source or a local workspace path.

The tag workflow installs from the committed lockfile, runs the complete lint, test, and build gates, packs the four-package graph, generates checksums, and creates the prerelease with the repository-scoped GitHub token. No npm credential is used.

This is intentionally narrower than the stable v0 release. See [ADR-0020](../architecture/adrs/0020-public-alpha-dogfood-channel.md) and [issue #30](https://github.com/AgentsKit-io/agentskit-chat/issues/30) for the remaining all-renderer, provenance, compatibility, documentation, and npm publication gates.
