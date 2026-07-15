# Stable public launch checklist

Executable close-out checklist for [issue #30](https://github.com/AgentsKit-io/agentskit-chat/issues/30).
AgentsKit Chat `0.3.0` is the two-package consolidation release.

## Documentation

- [x] Quick starts for React, React Native, Ink, Vue, Svelte, Solid, and Angular
- [x] API reference, deployment modes, stability, security, and changelog
- [x] Compatibility matrix, `0.3.0` release notes, and `0.2.x` migration map
- [x] Agent handoffs and doc-bridge ownership routing
- [x] Host adapter recipes for Next.js, Hono, Express, and Cloudflare Workers
- [x] README install path targets the two-package npm graph

## Engineering gates

Run from a clean checkout of `main`:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm test:conformance
pnpm conformance:gate
pnpm bundle:budget
pnpm docs:bridge:index
pnpm docs:bridge:doctor
pnpm docs:bridge:gate
pnpm release:gate
pnpm release:pack
pnpm test:e2e
pnpm test:pty
```

- [ ] Release and post-merge workflows pass on the `0.3.0` line
- [ ] Both public tarballs match `SHA256SUMS`
- [ ] All seven renderer exports pass clean-install verification
- [ ] Expo web and iOS production exports pass in the release workflow

## Distribution

- [ ] Immutable `v0.3.0` tag and GitHub release are public
- [ ] Both packages resolve from npm at exact `0.3.0`
- [ ] npm provenance attestations and registry signatures verify
- [ ] Clean external installation, ESM/CJS imports, and CLI scaffolding pass
- [ ] npm Trusted Publishing succeeds for both packages through OIDC
- [x] Temporary bootstrap `NPM_TOKEN` is absent from the protected `npm` environment

The stable workflow must remain token-free. Its protected publish job uses
`id-token: write`, npm 11, repository `AgentsKit-io/agentskit-chat`, workflow
`release.yml`, and environment `npm`.

## Dogfood

Source of truth for host status is [`ecosystem-adoption.json`](../../ecosystem-adoption.json)
(not this checklist). Do not mark ecosystem convergence complete while the ledger
still reports pending product chats (baseline: 3 of 6 certified).

- [x] AgentsKit Docs and Registry certified on npm `0.3.0` (ledger)
- [x] Playbook certified on npm `0.3.0` (ledger)
- [ ] Doc Bridge and remaining consumers clear of legacy packages (ledger: migrating / inventory)
- [ ] AgentsKit Chat docs portal production deployment (ledger: deployment-required)
- [ ] Frozen installs, strict typechecks/tests, and production builds pass for each host
- [ ] Public browser smoke passes for every certified product chat
- [ ] No private behavior, identifier, data, or topology enters public evidence

## Product close-out

- [ ] Record release, provenance, checksums, clean install, and host smoke links on #30
- [ ] Close issue #30 and milestone **v0 — Cross-framework foundation**
- [ ] Close PRD #1
