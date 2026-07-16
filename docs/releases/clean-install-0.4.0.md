# Clean external install evidence for 0.4.0

Recorded during distribution closeout for
[issue #104](https://github.com/AgentsKit-io/agentskit-chat/issues/104) on
2026-07-16. All commands ran outside the monorepo workspace with no
`workspace:` or link dependencies.

## Registry metadata (pre-patch)

| Package | Version | `homepage` on npm | Repository directory |
|---|---|---|---|
| `@agentskit/chat` | `0.4.0` | `https://github.com/AgentsKit-io/agentskit-chat#readme` | `packages/chat` |
| `@agentskit/chat-cli` | `0.4.0` | `https://github.com/AgentsKit-io/agentskit-chat#readme` | `packages/cli` |

Source manifests already declare `homepage: https://chat.agentskit.io/docs`.
That metadata requires a published patch (`0.4.1`) because npm versions are
immutable.

## Commands and results

### Clean install

```bash
mkdir /tmp/ak-chat-consumer && cd /tmp/ak-chat-consumer
npm init -y
npm install @agentskit/chat@0.4.0 @agentskit/chat-cli@0.4.0 --no-fund --no-audit
```

**Result:** PASS — both packages resolved at exact `0.4.0` (8 packages added).

### Root ESM and CommonJS entrypoints

```bash
node --input-type=module -e "import { defineChat } from '@agentskit/chat'; if (typeof defineChat !== 'function') process.exit(1)"
node -e "const { defineChat } = require('@agentskit/chat'); if (typeof defineChat !== 'function') process.exit(1)"
node --input-type=module -e "import { initChatProject } from '@agentskit/chat-cli'; if (typeof initChatProject !== 'function') process.exit(1)"
node -e "const { initChatProject } = require('@agentskit/chat-cli'); if (typeof initChatProject !== 'function') process.exit(1)"
```

**Result:** PASS — root ESM and CJS exports load for both packages.

### Export map integrity

All 35 declared `@agentskit/chat` export targets under `dist/` exist in the
installed tarball (`.`, `protocol`, `protocol/fixtures`, `server`, `devtools`,
and seven renderer subpaths). Protocol, server, and devtools load through both
ESM and CJS without host peers. Renderer subpaths require their documented peer
packages; with peers installed, React and Vue ESM/CJS entrypoints load.

### CLI scaffolding

```bash
mkdir /tmp/ak-chat-scaffold && cd /tmp/ak-chat-scaffold
npm init -y
npm install @agentskit/chat-cli@0.4.0 --no-fund --no-audit
npx agentskit-chat init app-react --renderer react --yes
cd app-react
npm install --no-fund --no-audit
npm run typecheck
npm test
npm run build
```

**Result:** PASS

| Check | Outcome |
|---|---|
| `agentskit-chat --version` | `0.4.0` |
| `init --renderer react --yes` | `{"ok":true}` with 12 files |
| `npm run typecheck` | PASS |
| `npm test` | 1 file, 2 tests passed |
| `npm run build` | Vite production build succeeded |

## Blocker carried into 0.4.1

Published npm `homepage` values still point at the GitHub readme. The reviewed
`0.4.1` patch republishes both packages with the canonical homepage and fails
closed in pack verification when that field is wrong.
