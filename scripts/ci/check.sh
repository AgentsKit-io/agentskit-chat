#!/usr/bin/env bash
# CI lint stage, static checks: typecheck, cross-platform check, conformance tests, changesets.
set -euo pipefail

pnpm lint
pnpm test:conformance

# Changesets are compared against main.
git fetch origin main:refs/remotes/origin/main
if [ "$(git branch --show-current)" != "main" ]; then git branch --force main origin/main; fi
pnpm exec changeset status
