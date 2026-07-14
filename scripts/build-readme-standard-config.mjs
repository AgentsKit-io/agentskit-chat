#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './compute-readme-claims.mjs'

const approval = {
  approvedBy: 'EmersonBraun',
  approvedOn: '2026-07-13',
  record: 'https://github.com/AgentsKit-io/agentskit/issues/1203#issuecomment-4963143065',
}

const profiles = [
  { id: 'top-level-repository', description: 'Parent or product repository with a full adoption and contribution journey.', budgets: { badges: { max: 12 }, images: { min: 1, max: 6, zeroRequiresException: true }, accessibility: { maxMissingAlt: 0 }, darkMode: { requireStrategy: true }, commandVerification: { maxUnverifiedPrimary: 0 }, freshness: { reviewCadenceDays: 90, requireSourceHash: true } } },
  { id: 'public-app', description: 'Runnable public product or documentation application.', budgets: { badges: { max: 8 }, images: { min: 1, max: 5, zeroRequiresException: true }, accessibility: { maxMissingAlt: 0 }, darkMode: { requireStrategy: true }, commandVerification: { maxUnverifiedPrimary: 0 }, freshness: { reviewCadenceDays: 90, requireSourceHash: true } } },
  { id: 'major-package', description: 'Primary package with its own adoption journey, examples, and compatibility surface.', budgets: { badges: { max: 8 }, images: { min: 1, max: 4, zeroRequiresException: true }, accessibility: { maxMissingAlt: 0 }, darkMode: { requireStrategy: true }, commandVerification: { maxUnverifiedPrimary: 0 }, freshness: { reviewCadenceDays: 120, requireSourceHash: true } } },
  { id: 'concise-package', description: 'Focused package whose README may stay short when the package guide carries depth.', budgets: { badges: { max: 6 }, images: { min: 0, max: 2, zeroRequiresException: true }, accessibility: { maxMissingAlt: 0 }, darkMode: { requireStrategy: true }, commandVerification: { maxUnverifiedPrimary: 0 }, freshness: { reviewCadenceDays: 180, requireSourceHash: true } } },
]

const visualException = {
  ruleId: 'visual-exception',
  reason: 'Mermaid explains the binding journey; a raster diagram would duplicate the package guide without adding understanding.',
  approvedBy: 'EmersonBraun',
  trackingUrl: 'https://github.com/AgentsKit-io/agentskit-chat/issues/84',
  reviewOn: '2026-10-12',
}

const architectureVisual = {
  src: 'docs/assets/agentschat-architecture.svg',
  kind: 'explanation',
  darkMode: 'neutral',
}

const exampleTest = {
  test: 'scripts/readme-standard.test.mjs',
  testCommand: 'pnpm test:readme-standard',
}

const commandTest = test => ({ test, testCommand: 'pnpm test' })

const surfaces = [
  {
    id: 'agentschat-root',
    path: 'README.md',
    profileId: 'top-level-repository',
    dimensions: {
      promise: ['<code>top-level-repository</code>', '<strong>One agent experience. Every interface.</strong>'],
      proof: ['## Verified proof', 'ecosystem-claims.json'],
      examples: ['## Quick start', '<!-- readme-example:init-react -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['## Maturity and compatibility', '0.2.0'],
      compatibility: ['Node.js 22', 'TypeScript'],
      contribution: ['## Contributing', 'CONTRIBUTING.md', 'LICENSE'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'registry.agentskit.io', 'playbook.agentskit.io'],
    },
    visuals: [
      { src: 'docs/assets/agentschat-mark.svg', kind: 'brand', darkMode: 'neutral' },
      architectureVisual,
    ],
    commands: [
      { id: 'verify-readme', command: 'node examples/verify-readme.mjs', test: 'examples/verify-readme.mjs', testCommand: 'pnpm test:readme-standard' },
      { id: 'init-react', command: 'pnpm dlx @agentskit/chat-cli@0.2.0 init my-chat --renderer react --yes', ...commandTest('packages/cli/tests/init.test.ts') },
    ],
    examples: [{ id: 'init-react', fixture: 'examples/init-react.sh', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-10-12',
      sources: ['README.md', 'package.json', 'tsconfig.base.json', 'release/manifest.json', 'ecosystem-claims.json', 'examples/verify-readme.mjs', 'examples/init-react.sh', 'scripts/compute-readme-claims.mjs', 'scripts/gen-ecosystem-claims.mjs', 'scripts/lib/readme-claims.mjs', 'docs/releases/stability.md', 'docs/releases/compatibility.md', '.github/workflows/ci.yml', '.github/workflows/release.yml', '.github/workflows/release-alpha.yml'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
  {
    id: 'package-chat',
    path: 'packages/chat/README.md',
    profileId: 'major-package',
    dimensions: {
      promise: ['Framework-neutral application definitions'],
      proof: ['## Verified proof', 'catalog.generated.md'],
      examples: ['## Quick start', '<!-- readme-example:define-chat -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['Published at `0.2.0`', 'stability.md'],
      compatibility: ['Node.js 22+', 'TypeScript strict mode'],
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit', 'registry.agentskit.io'],
    },
    visuals: [architectureVisual],
    commands: [{ id: 'install-chat', command: 'npm install @agentskit/chat @agentskit/core', ...commandTest('packages/chat/tests/define-chat.test.ts') }],
    examples: [{ id: 'define-chat', fixture: 'packages/chat/fixtures/readme-example.ts', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-11-11',
      sources: ['packages/chat/README.md', 'packages/chat/package.json', 'packages/chat/tsconfig.json', 'packages/chat/fixtures/readme-example.ts', 'docs/components/catalog.generated.md'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
  {
    id: 'package-protocol',
    path: 'packages/protocol/README.md',
    profileId: 'major-package',
    dimensions: {
      promise: ['Framework-neutral v1 turn events'],
      proof: ['## Verified proof', 'v1.md'],
      examples: ['## Quick start', '<!-- readme-example:decode-turn -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['Published at `0.2.0`', 'stability.md'],
      compatibility: ['Node.js 22+', 'TypeScript strict mode'],
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit'],
    },
    visuals: [architectureVisual],
    commands: [{ id: 'install-protocol', command: 'npm install @agentskit/chat-protocol', ...commandTest('packages/protocol/tests/protocol.test.ts') }],
    examples: [{ id: 'decode-turn', fixture: 'packages/protocol/fixtures/readme-example.ts', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-11-11',
      sources: ['packages/protocol/README.md', 'packages/protocol/package.json', 'packages/protocol/tsconfig.json', 'packages/protocol/fixtures/readme-example.ts', 'docs/protocol/v1.md'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
  {
    id: 'package-server',
    path: 'packages/server/README.md',
    profileId: 'major-package',
    dimensions: {
      promise: ['Web-standard request handlers'],
      proof: ['## Verified proof', 'ADR-0012'],
      examples: ['## Quick start', '<!-- readme-example:chat-handler -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['Published at `0.2.0`', 'deployment.md'],
      compatibility: ['Node.js 22+', 'Web-standard `Request` / `Response`'],
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit'],
    },
    visuals: [architectureVisual],
    commands: [{ id: 'install-server', command: 'npm install @agentskit/chat-server @agentskit/chat @agentskit/core', ...commandTest('packages/server/tests/handler.test.ts') }],
    examples: [{ id: 'chat-handler', fixture: 'packages/server/fixtures/readme-example.ts', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-11-11',
      sources: ['packages/server/README.md', 'packages/server/package.json', 'packages/server/tsconfig.json', 'packages/server/fixtures/readme-example.ts', 'docs/deployment.md'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
  {
    id: 'package-cli',
    path: 'packages/cli/README.md',
    profileId: 'major-package',
    dimensions: {
      promise: ['Framework-aware scaffolding'],
      proof: ['## Verified proof', 'ADR-0014'],
      examples: ['## Quick start', '<!-- readme-example:renderers -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['Published at `0.2.0`', 'angular'],
      compatibility: ['Node.js 22+', 'Never merges'],
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit'],
    },
    visuals: [architectureVisual],
    commands: [{ id: 'init-chat', command: 'agentskit-chat init my-chat --renderer react --yes', ...commandTest('packages/cli/tests/init.test.ts') }],
    examples: [{ id: 'renderers', fixture: 'packages/cli/fixtures/readme-example.mjs', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-11-11',
      sources: ['packages/cli/README.md', 'packages/cli/package.json', 'packages/cli/fixtures/readme-example.mjs', 'docs/cli.md'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
  {
    id: 'package-react',
    path: 'packages/react/README.md',
    profileId: 'major-package',
    dimensions: {
      promise: ['Accessible React application shell'],
      proof: ['## Verified proof', 'dom-renderer-parity.md'],
      examples: ['## Quick start', '<!-- readme-example:agent-chat -->'],
      visuals: ['docs/assets/agentschat-architecture.svg', '```mermaid'],
      maturity: ['Published at `0.2.0`', 'React 18+'],
      compatibility: ['React 18+', 'TypeScript strict mode'],
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit'],
    },
    visuals: [architectureVisual],
    commands: [{ id: 'install-react', command: 'npm install @agentskit/chat-react @agentskit/chat @agentskit/react', ...commandTest('packages/react/tests/agent-chat.test.tsx') }],
    examples: [{ id: 'agent-chat', fixture: 'packages/react/fixtures/readme-example.tsx', ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2026-11-11',
      sources: ['packages/react/README.md', 'packages/react/package.json', 'packages/react/tsconfig.json', 'packages/react/fixtures/readme-example.tsx', 'docs/getting-started/react.md'],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [],
  },
]

const concisePackages = [
  { dir: 'vue', exampleId: 'import-vue', commandId: 'install-vue', command: 'npm install @agentskit/chat-vue @agentskit/chat @agentskit/vue', promise: 'Native Vue 3 application shell', compatibility: ['Vue 3.4+', 'TypeScript strict mode'], guide: 'docs/getting-started/vue.md', test: 'packages/vue/tests/agent-chat.test.ts' },
  { dir: 'svelte', exampleId: 'import-svelte', commandId: 'install-svelte', command: 'npm install @agentskit/chat-svelte @agentskit/chat @agentskit/svelte', promise: 'Svelte 5 application shell', compatibility: ['Svelte 5+', 'SSR evidence in CI'], guide: 'docs/getting-started/svelte.md', test: 'packages/svelte/tests/agent-chat.test.ts' },
  { dir: 'solid', exampleId: 'import-solid', commandId: 'install-solid', command: 'npm install @agentskit/chat-solid @agentskit/chat @agentskit/solid', promise: 'Solid application shell', compatibility: ['Solid 1.9+', 'TypeScript strict mode'], guide: 'docs/getting-started/solid.md', test: 'packages/solid/tests/agent-chat.test.tsx' },
  { dir: 'angular', exampleId: 'import-angular', commandId: 'install-angular', command: 'npm install @agentskit/chat-angular @agentskit/chat @agentskit/angular', promise: 'Native Angular application shell', compatibility: ['Angular 18.1–21', 'Partial-Ivy AOT package test in CI'], guide: 'docs/getting-started/angular.md', test: 'packages/angular/tests/agent-chat.test.ts' },
  { dir: 'react-native', exampleId: 'import-react-native', commandId: 'install-react-native', command: 'npm install @agentskit/chat-react-native @agentskit/chat @agentskit/react-native', promise: 'React Native application shell', compatibility: ['React 18+', 'Native accessibility roles in CI'], guide: 'docs/getting-started/react-native.md', test: 'packages/react-native/tests/agent-chat-native.test.tsx' },
  { dir: 'ink', exampleId: 'import-ink', commandId: 'install-ink', command: 'npm install @agentskit/chat-ink @agentskit/chat @agentskit/ink', promise: 'Opinionated Ink shell', compatibility: ['Ink 7.1+', 'Terminal keyboard flow and graceful process exit verified'], guide: 'docs/getting-started/ink.md', test: 'packages/ink/tests/agent-chat.test.tsx' },
  { dir: 'devtools', exampleId: 'import-devtools', commandId: 'install-devtools', command: 'npm install @agentskit/chat-devtools @agentskit/eval', promise: 'Application trace capture', compatibility: ['Node.js 22+', 'Composes upstream replay'], guide: 'docs/devtools.md', test: 'packages/devtools/tests/devtools.test.ts' },
]

for (const pkg of concisePackages) {
  const ext = pkg.dir === 'devtools' ? 'ts' : pkg.dir === 'react-native' || pkg.dir === 'ink' ? 'tsx' : 'ts'
  surfaces.push({
    id: `package-${pkg.dir}`,
    path: `packages/${pkg.dir}/README.md`,
    profileId: 'concise-package',
    dimensions: {
      promise: [pkg.promise],
      proof: ['## Verified proof', 'matrix.generated.md'],
      examples: ['## Quick start', `<!-- readme-example:${pkg.exampleId} -->`],
      visuals: ['```mermaid'],
      maturity: ['Published at `0.2.0`'],
      compatibility: pkg.compatibility,
      contribution: ['## Contributing', 'CONTRIBUTING.md'],
      metadata: ['**Tags:**', '`agentskit-chat`'],
      ecosystem: ['## AgentsKit ecosystem', 'AgentsKit-io/agentskit'],
    },
    visuals: [],
    commands: [{ id: pkg.commandId, command: pkg.command, ...commandTest(pkg.test) }],
    examples: [{ id: pkg.exampleId, fixture: `packages/${pkg.dir}/fixtures/readme-example.${ext}`, ...exampleTest }],
    freshness: {
      reviewedOn: '2026-07-14',
      reviewDueOn: '2027-01-10',
      sources: [`packages/${pkg.dir}/README.md`, `packages/${pkg.dir}/package.json`, `packages/${pkg.dir}/tsconfig.json`, `packages/${pkg.dir}/fixtures/readme-example.${ext}`, pkg.guide],
      sourceHash: 'sha256:placeholder',
    },
    exceptions: [visualException],
  })
}

const config = {
  schemaVersion: 1,
  standardId: 'agentskit-readme-standard-v1',
  status: 'approved',
  approval,
  profiles,
  surfaces,
}

writeFileSync(join(REPO_ROOT, 'readme-standard-v1.json'), `${JSON.stringify(config, null, 2)}\n`)
console.log(`wrote readme-standard-v1.json with ${surfaces.length} surfaces`)
