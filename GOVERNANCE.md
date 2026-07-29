# Governance

AgentsKit Chat is maintained in public by the AgentsKit organization. Emerson
Braun is the primary maintainer. Repository maintainers are responsible for
triage, reviews, releases, security response, and enforcement of the
contribution and conduct policies.

## Decisions

Bug reports, feature proposals, and implementation decisions belong in public
issues and pull requests whenever they do not involve a vulnerability or
private data. Maintainers decide by documented technical merit, cross-framework
compatibility, maintenance cost, upstream-first adoption, and evidence from
tests or reproducible examples.

Small, focused changes may proceed directly through a pull request.
Contributors should open an issue before a large architectural or contract
change. Maintainers have final merge authority and may decline changes that
expand scope without sufficient evidence or a sustainable maintenance path.

Security reports follow [SECURITY.md](SECURITY.md) and remain private until
coordinated disclosure is appropriate. Conduct matters follow
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Releases

Stable releases are cut from `main` using immutable semantic-version tags. The
release workflow verifies tag ancestry and package versions, reruns the quality,
conformance, browser, native, terminal, documentation, and package gates, then
publishes the public package graph from the protected `npm` environment using
OIDC provenance. A GitHub release becomes public only after npm publication
succeeds.

The detailed release procedure and verification path are documented in
[docs/releases/release-process.md](docs/releases/release-process.md).
Maintainer or release-process changes are documented through the same pull
request workflow.
