# Upgrade from 0.2.x to 0.3.0

AgentsKit Chat `0.3.0` reduces the public npm graph to `@agentskit/chat` and
`@agentskit/chat-cli`. Remove the former standalone Chat packages after moving
their imports to the corresponding subpaths.

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
npm install @agentskit/chat@0.3.0 @agentskit/react react
npm install --save-dev @agentskit/chat-cli@0.3.0
```

Protocol versions, deterministic answers, Ask requests, session persistence,
component identities, and renderer behavior are unchanged. The migration is a
package/import rewrite rather than a runtime or business-logic migration.

After updating, remove obsolete package entries from the manifest and lockfile,
perform a frozen install, and run typecheck, tests, production build, and a real
streaming interaction smoke test. Do not keep aliases or compatibility
overrides that hide a remaining legacy import.

## Optional migration for host-owned sessions

Hosts that already receive a complete chat snapshot from a trusted session
service may replace local controller wiring with the additive `controlled` prop
on the React `AgentChat`. The source supplies a serializable snapshot and the
canonical AgentsKit lifecycle callbacks. Do not run both modes for one mounted
chat, and do not move authentication, authorization, persistence, transport, or
business rules into the public driver. Hosts that use `definition.chat` locally
need no change.
