# Upgrade from 0.2.x to 0.3.0

AgentsKit Chat `0.3.0` reduces the public npm graph to `@agentskit/chat` and
`@agentskit/chat-cli`. Remove the former standalone Chat packages after moving
their imports to the corresponding subpaths.

The current stable release is `0.4.1`. It preserves this package graph and the
`0.3.0` import contract, so new migrations should install `0.4.1` directly.

| Former package | `0.3.0` import |
|---|---|
| `@agentskit/chat-protocol` | `@agentskit/chat/protocol` |
| `@agentskit/chat-server` | `@agentskit/chat/server` |
| `@agentskit/chat-devtools` | `@agentskit/chat/devtools` |
| `@agentskit/chat-react` | `@agentskit/chat/react` |
| `@agentskit/chat-react-native` | `@agentskit/chat/react-native` |
| `@agentskit/chat-ink` | `@agentskit/chat/ink` |
| `@agentskit/chat-vue` | `@agentskit/chat/vue` |
| `@agentskit/chat-svelte` | `@agentskit/chat/svelte` |
| `@agentskit/chat-solid` | `@agentskit/chat/solid` |
| `@agentskit/chat-angular` | `@agentskit/chat/angular` |

Install only the consolidated package, the AgentsKit binding, and framework
peers used by the host:

```bash
npm install @agentskit/chat@0.4.1 @agentskit/react react
npm install --save-dev @agentskit/chat-cli@0.4.1
```

Protocol versions, deterministic answers, Ask requests, session persistence,
component identities, and renderer behavior are unchanged. The migration is a
package/import rewrite rather than a runtime or business-logic migration.

After updating, remove obsolete package entries from the manifest and lockfile,
perform a frozen install, and run typecheck, tests, production build, and a real
streaming interaction smoke test. Do not keep aliases or compatibility
overrides that hide a remaining legacy import.

The old `0.2.x` package names remain published and installable. After every
declared product chat passes the public convergence ledger and the release
owner approves the deprecation dry-run, those versions receive npm deprecation
warnings that point here; they are not unpublished. Maintainers can inspect
that fail-closed report without changing npm state:

```bash
pnpm release:deprecation:plan
```

## Optional migration after upgrading to 0.4.0

Hosts that already receive a complete chat snapshot from a trusted session
service may replace local controller wiring with the additive `controlled` prop
on the React or Ink `AgentChat`. The source supplies a serializable snapshot and
the canonical AgentsKit lifecycle callbacks. Do not run both modes for one
mounted chat, and do not move authentication, authorization, persistence,
transport, or business rules into the public driver. Hosts that use
`definition.chat` locally need no change.

See the [0.4.0 release notes](./v0.4.0.md) for the controlled-session contract
and evidence. This capability is not part of the `0.3.0` API.

Before merging the migration, run the host's frozen install, tests, build, and
streaming smoke, then use [AgentsKit Code Review](https://github.com/AgentsKit-io/code-review-cli#readme)
to inspect the import rewrite. If the repository's documentation ownership is
unclear, generate an executable handoff with
[Doc Bridge](https://doc-bridge.agentskit.io/).
