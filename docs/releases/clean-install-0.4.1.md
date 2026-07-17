# Clean external install evidence for 0.4.1

Recorded during distribution closeout for
[issue #104](https://github.com/AgentsKit-io/agentskit-chat/issues/104) on
2026-07-16. Commands ran in a new temporary npm project outside the monorepo,
without workspace or linked dependencies.

## Registry and install result

Both `@agentskit/chat@0.4.1` and `@agentskit/chat-cli@0.4.1` installed from npm.
Their registry metadata reports `homepage: https://chat.agentskit.io/docs`.
`npm audit signatures` verified eight registry signatures and three provenance
attestations.

## Runtime result

- Root ESM and CommonJS imports loaded for both packages.
- `defineChat` and `initChatProject` resolved as functions.
- The installed `agentskit-chat --version` returned `0.4.1`.
- The public npm tarballs byte-match the prepared draft release artifacts and
  their `SHA256SUMS`. Those assets become public evidence only when the GitHub
  release is published.

This evidence covers public distribution only. The AKOS consumer is represented
separately by the fixed aggregate private-attestation envelope; no private
implementation detail is included here.
