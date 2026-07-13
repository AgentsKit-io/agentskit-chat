# Alpha dogfood channel

`v0.1.0-alpha.2` is the current public artifact channel used by the external Docs, Registry, and Playbook migrations before stable v0. It adds the shared Ask-service integration on top of the ordered assistant-content protocol introduced in `alpha.1`.

The GitHub prerelease contains npm-compatible tarballs and `SHA256SUMS` for `@agentskit/chat-protocol`, `@agentskit/chat`, `@agentskit/chat-react`, and `@agentskit/chat-server`. Consumers pin all required release asset URLs in their package manifest and lockfile. Because pnpm correctly rewrites `workspace:*` edges to the alpha semver while that semver is intentionally absent from npm, consumers must also redirect the two internal graph roots with `pnpm.overrides`:

```json
{
  "dependencies": {
    "@agentskit/chat-protocol": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-protocol-0.1.0-alpha.2.tgz",
    "@agentskit/chat": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-0.1.0-alpha.2.tgz",
    "@agentskit/chat-react": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-react-0.1.0-alpha.2.tgz",
    "@agentskit/chat-server": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-server-0.1.0-alpha.2.tgz"
  },
  "pnpm": {
    "overrides": {
      "@agentskit/chat-protocol": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-protocol-0.1.0-alpha.2.tgz",
      "@agentskit/chat": "https://github.com/AgentsKit-io/agentskit-chat/releases/download/v0.1.0-alpha.2/agentskit-chat-0.1.0-alpha.2.tgz"
    }
  }
}
```

The clean-room verifier exercises this exact graph resolution. Consumers must not omit the overrides, import this repository's source, or use a local workspace path.

The tag workflow verifies that the tagged commit belongs to `main`, installs from the committed lockfile, runs lint, test, build, and doc-bridge gates, packs the four-package graph, verifies its manifests and checksums, and exercises ESM, CJS, and a production Vite build in a clean-room consumer. It uploads a draft, verifies the complete asset set, and only then publishes with the repository-scoped GitHub token. GitHub Immutable Releases is enabled for this repository. No npm credential is used.

This is intentionally narrower than the stable v0 release. See [ADR-0020](../architecture/adrs/0020-public-alpha-dogfood-channel.md) and [issue #30](https://github.com/AgentsKit-io/agentskit-chat/issues/30) for the remaining all-renderer, provenance, compatibility, documentation, and npm publication gates.
