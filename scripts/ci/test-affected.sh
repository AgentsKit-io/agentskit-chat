#!/usr/bin/env bash
# CI test stage on pull requests: packages affected since BASE_REF, plus the cheap root suites.
set -euo pipefail

: "${BASE_REF:?BASE_REF is required}"
pnpm -r --workspace-concurrency=1 --filter "...[$BASE_REF]" --if-present test
pnpm test:bundle-budget
pnpm test:ecosystem-adoption
pnpm test:release-deprecation
pnpm test:release-lib
pnpm test:retrieval-suite
