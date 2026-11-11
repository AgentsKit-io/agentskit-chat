#!/usr/bin/env bash
# CI build stage: build, then every check that needs the build output or the generated index.
set -euo pipefail

pnpm build
pnpm check:public-api
pnpm conformance:gate
pnpm bundle:budget

# Generate ignored artifacts; this proves determinism, not committed-index freshness.
# Build deterministic repository index
pnpm docs:bridge:index
first_index=$(mktemp)
trap 'rm -f "$first_index"' EXIT
cp .doc-bridge/index.json "$first_index"
pnpm docs:bridge:index
cmp "$first_index" .doc-bridge/index.json
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0'))
const index = JSON.parse(readFileSync('.doc-bridge/index.json', 'utf8'))
const untracked = index.knowledge.filter(entry => !tracked.has(entry.path))
if (untracked.length) throw new Error(`Index includes untracked inputs: ${untracked.map(entry => entry.path).join(', ')}`)
NODE
pnpm docs:bridge:gate
pnpm docs:bridge:conformance
pnpm docs:bridge:doctor
pnpm exec vitest run scripts/doc-bridge-index.test.mjs --maxWorkers=2
pnpm ecosystem:claims:check
pnpm ecosystem:adoption:check
pnpm check:readme-standard
pnpm test:readme-standard
node scripts/release-gate.mjs
node scripts/pack-release.mjs
