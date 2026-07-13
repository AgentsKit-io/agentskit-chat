# Migrate from `0.1.0-alpha.2`

Stable `0.1.0` keeps the alpha.2 application and protocol contracts and adds
the complete npm package matrix. No source-level API rename is required.

1. Replace GitHub release-asset URLs with npm ranges.
2. Remove `pnpm.overrides` entries that redirected internal alpha packages.
3. Install the renderer, core, protocol/server packages, and their documented
   peers at `0.1.0`.
4. Regenerate and commit the lockfile.
5. Run the host typecheck, production build, interaction/E2E suite, and any
   stored-session migration fixtures.

Example:

```json
{
  "dependencies": {
    "@agentskit/chat": "^0.1.0",
    "@agentskit/chat-protocol": "^0.1.0",
    "@agentskit/chat-react": "^0.1.0",
    "@agentskit/chat-server": "^0.1.0"
  }
}
```

The immutable alpha release and checksums remain available for reproducible old
lockfiles, but receive no new features. Do not mix alpha asset overrides with
stable npm packages in one dependency graph.
