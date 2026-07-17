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
- [x] Clean external installation, ESM/CJS imports, and CLI scaffolding pass
- [x] npm Trusted Publishing succeeds for both packages through OIDC
- [x] Published `0.4.1` aligns both public npm homepages with `https://chat.agentskit.io/docs`
- [ ] The GitHub `v0.4.1` release and its checksum assets are public

Evidence for the clean external consumer paths is recorded in
[clean-install-0.4.0.md](./clean-install-0.4.0.md) and
[clean-install-0.4.1.md](./clean-install-0.4.1.md). Exact `0.4.1` registry
metadata, signatures, attestations, ESM/CJS loading, and CLI version were
re-read after Trusted Publishing.
- [x] Temporary bootstrap `NPM_TOKEN` is absent from the protected `npm` environment

The stable workflow must remain token-free. Its protected publish job uses
`id-token: write`, npm 11, repository `AgentsKit-io/agentskit-chat`, workflow
`release.yml`, and environment `npm`.

## Dogfood

- [x] AgentsKit Docs, Registry, Playbook, and Doc Bridge are certified at the audited baseline
- [x] Chat Docs is certified with the canonical production evidence from #102
- [x] AKOS is re-certified through a fresh approved aggregate private production attestation
- [x] Frozen installs, strict typechecks/tests, and production builds pass for all declared product chats
- [x] Public browser smoke passes for AgentsKit Docs, Registry, Chat Docs, Playbook, and Doc Bridge
- [x] No private AKOS behavior, identifier, data, or topology enters public evidence

## Product close-out

- [ ] Record release, provenance, checksums, clean install, and host smoke links on #104
- [x] Complete the convergence ledger only after every public and private tracer passes

## Legacy package retirement

- [x] #102 is closed with canonical deployment evidence and the Chat documentation portal is certified in the ledger
- [x] The exact ten-command dry-run received explicit HITL approval on #103
- [x] All ten npm deprecations were applied one at a time and all 20 published versions were re-read
- [x] Canonical replacement subpaths and migration links match on every deprecated version
- [x] ADR-0027 and ADR-0030 are Accepted with the required HITL recorded for the retirement decision
