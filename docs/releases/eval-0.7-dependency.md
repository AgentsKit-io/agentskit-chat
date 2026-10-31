# @agentskit/chat on @agentskit/eval ^0.7

`@agentskit/chat` is released from 0.7.0 depending on `@agentskit/eval ^0.7.0`
(see [v0.7.0](./v0.7.0.md)).

## Evidence

| Requirement | Proof |
| --- | --- |
| `packages/chat` and `packages/devtools` declare `@agentskit/eval ^0.7` | `scripts/eval-dependency.test.mjs` (`pnpm exec vitest run scripts/eval-dependency.test.mjs`) |
| The published graph and manifest are consistent | `scripts/release-lib.test.mjs` (`pnpm test:release-lib`) |

Publishing follows the regular release process ([release-process](./release-process.md)).
