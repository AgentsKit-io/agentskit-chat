import { appendFileSync } from 'node:fs'

const add = (file, text) => appendFileSync(file, text)

add(
  'docs/for-agents/apps/docs.md',
  `
## Source layout

- \`apps/docs/app/docs\` is the catch-all Fumadocs route that renders the canonical \`docs/\` corpus.
- \`apps/docs/app/for-agents\` redirects to these maintainer handoffs on GitHub.
- \`apps/docs/app/raw\`, \`apps/docs/app/llms.txt\` and \`apps/docs/app/llms-full.txt\` are the raw-Markdown and llms.txt route handlers.
- \`apps/docs/app/api\` holds the \`ask\`, \`demo-ask\` and \`search\` route handlers.
- \`apps/docs/app/demo\` holds the \`agent-observability\` and \`deterministic-chat\` demo pages.
- \`apps/docs/app/deterministic\` holds the \`knowledge.json\` and \`site-config.json\` deterministic-answer artifacts.
- \`apps/docs/app/assets\` serves the allowlisted SVGs from \`docs/assets\`.
- \`apps/docs/scripts\` holds the docs index builder, the build-budget check and the home-page UI verifier.
- \`apps/docs/tests\` holds the Vitest dogfood and front matter tests and the Playwright specs in \`apps/docs/tests/e2e\`.
- \`apps/docs/types\` holds ambient type declarations such as \`css-modules.d.ts\`.
`,
)

add(
  'docs/for-agents/apps/example-ink.md',
  `
The PTY suite lives in \`apps/example-ink/tests\` (\`ink-pty.test.ts\`).
`,
)

add(
  'docs/for-agents/apps/example-shared.md',
  `
Its Vitest suite lives in \`apps/example-shared/tests\` (\`support.test.ts\`).
`,
)

add(
  'docs/for-agents/release.md',
  `
## Release scripts

The repository-level \`scripts\` directory holds the gates and tooling behind these commands, such as \`scripts/release-gate.mjs\`, \`scripts/pack-release.mjs\`, \`scripts/conformance-gate.mjs\`, \`scripts/bundle-budget.mjs\` and the README-standard and publication-surface checks.
`,
)

add(
  'docs/for-agents/architecture.md',
  `
## Repository-level tests

The repository-level \`tests\` directory holds cross-package evidence: \`tests/turn-protocol-conformance.ts\` is the shared protocol conformance runner imported by the renderer conformance tests, \`tests/conformance-gate.test.ts\` covers the conformance gate, \`tests/e2e\` holds the Playwright quickstart and example specs, and \`tests/storage-pg\` holds the Postgres session-storage contract.
`,
)
