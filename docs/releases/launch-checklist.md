# Stable public launch checklist

Executable close-out checklist for [issue #104](https://github.com/AgentsKit-io/agentskit-chat/issues/104).
AgentsKit Chat `0.4.0` adds controlled React and Ink sessions to the consolidated
two-package graph.

## Documentation

- [x] Quick starts for React, React Native, Ink, Vue, Svelte, Solid, and Angular
- [x] API reference, deployment modes, stability, security, and changelog
- [x] Compatibility matrix, `0.4.0` release notes, and `0.2.x` migration map
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
pnpm release:deprecation:plan
pnpm test:e2e
pnpm test:pty
```

- [x] Release and post-merge workflows pass on the `0.4.0` line
- [x] Both public tarballs match `SHA256SUMS`
- [x] All seven renderer exports pass clean-install verification
- [x] Expo web and iOS production exports pass in the release workflow

Immutable evidence: [stable release workflow](https://github.com/AgentsKit-io/agentskit-chat/actions/runs/29431524999)
and [v0.4.0 release assets](https://github.com/AgentsKit-io/agentskit-chat/releases/tag/v0.4.0).

## Distribution

- [x] Immutable `v0.4.0` tag and GitHub release are public
- [x] Both packages resolve from npm at exact `0.4.0`
- [x] npm provenance attestations and registry signatures verify
- [ ] Clean external installation, ESM/CJS imports, and CLI scaffolding pass
- [x] npm Trusted Publishing succeeds for both packages through OIDC
- [ ] A reviewed patch aligns both public npm homepages with `https://chat.agentskit.io/docs`
- [x] Temporary bootstrap `NPM_TOKEN` is absent from the protected `npm` environment

The stable workflow must remain token-free. Its protected publish job uses
`id-token: write`, npm 11, repository `AgentsKit-io/agentskit-chat`, workflow
`release.yml`, and environment `npm`.

## Dogfood

- [x] AgentsKit Docs, Registry, Playbook, and Doc Bridge are certified at the audited baseline
- [ ] Chat Docs is certified with the canonical production evidence from #102
- [ ] AKOS is certified through an approved aggregate private attestation
- [ ] Frozen installs, strict typechecks/tests, and production builds pass for all declared consumers
- [ ] Public browser smoke passes for AgentsKit Docs, Registry, Chat Docs, Playbook, and Doc Bridge
- [ ] No private AKOS behavior, identifier, data, or topology enters public evidence

## Product close-out

- [ ] Record release, provenance, checksums, clean install, and host smoke links on #104
- [ ] Complete the convergence ledger only after every public and private tracer passes

## Legacy package retirement

- [ ] #102 is merged and the Chat documentation portal is certified in the ledger
- [ ] AKOS has an approved aggregate private attestation and is certified in the ledger
- [ ] `pnpm release:deprecation:plan -- --require-ready` passes on clean `main`
- [ ] The exact ten-command dry-run receives explicit HITL approval on #103
- [ ] Each npm mutation is re-read and linked before proceeding to the next package
- [ ] ADR-0027 and ADR-0030 statuses match the final production and convergence truth
