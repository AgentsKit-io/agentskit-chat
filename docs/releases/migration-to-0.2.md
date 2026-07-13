# Upgrade from 0.1.x to 0.2.0

AgentsKit Chat packages are a fixed version group. Upgrade every installed
`@agentskit/chat*` package to `0.2.0` in the same change and commit the updated
lockfile.

```json
{
  "dependencies": {
    "@agentskit/chat": "0.2.0",
    "@agentskit/chat-protocol": "0.2.0",
    "@agentskit/chat-react": "0.2.0",
    "@agentskit/chat-server": "0.2.0"
  }
}
```

Existing definitions and renderer shells require no source migration. The new
backend APIs are additive. Applications adopting them should configure the
documented server boundary, keep corpus and persona authority in trusted server
configuration, and limit client hosts to documented identity, endpoint, and
presentation seams.

After updating, run the host typecheck, tests, production build, and a real
streaming smoke test. A service that emits Ask NDJSON may use the canonical
NDJSON content type; `0.2.0` also recognizes valid records when an intermediary
incorrectly labels the response as `text/plain`.

See the [backend guide](../backend.md), [Ask protocol](../protocol/ask-service.md),
and [deployment guide](../deployment.md).
