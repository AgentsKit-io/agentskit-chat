# Stable public launch checklist

Executable close-out checklist for [issue #30](https://github.com/AgentsKit-io/agentskit-chat/issues/30).
AgentsKit Chat `0.2.0` is public and dogfooded; only the trusted-publishing
credential transition remains operationally open.

## Documentation

- [x] Quick starts for React, React Native, Ink, Vue, Svelte, Solid, and Angular
- [x] API reference, deployment modes, stability, security, and changelog
- [x] Compatibility matrix and release notes for `0.2.0`
- [x] Agent handoffs and doc-bridge ownership routing
- [x] CONTRIBUTING and Code of Conduct
- [x] Host adapter recipes for Next.js, Hono, Express, and Cloudflare Workers
- [x] README install path resolves to the live npm graph

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

- [x] Release and post-merge workflows passed on the published line
- [x] All twelve package tarballs match `SHA256SUMS`
- [x] Expo web and iOS production exports passed in the release workflow

## Distribution

- [x] Immutable `v0.2.0` tag and GitHub release are public
- [x] All twelve packages resolve from npm at exact `0.2.0`
- [x] npm provenance attestations and registry signatures verify
- [x] Clean external installation and ESM imports pass
- [x] `pnpm dlx @agentskit/chat-cli@0.2.0 init smoke-chat --renderer react --yes` works cleanly
- [ ] Configure npm Trusted Publishing for all twelve packages
- [ ] Remove the temporary bootstrap `NPM_TOKEN` from the protected `npm` environment

The token removal must happen only after every package lists the GitHub Actions
trusted publisher for `.github/workflows/release.yml` and a protected dry run
confirms OIDC publication readiness.

## Dogfood

- [x] AgentsKit Docs and Registry pin npm `0.2.0`
- [x] Playbook pins npm `0.2.0`
- [x] Public browser smoke passed for Docs, Registry, and Playbook
- [x] Ask cache-integrity follow-up shipped and passed exact-replay validation
- [x] Public evidence is linked from `docs/dogfood/`

## Product close-out

- [ ] Complete the two trusted-publishing steps above
- [ ] Close issue #30 with the final release-operations evidence
- [ ] Complete the remaining public maturity and documentation-site issues
- [ ] Close PRD #1 and milestone **v0 — Cross-framework foundation**
