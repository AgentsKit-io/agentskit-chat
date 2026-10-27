import { appendFileSync } from 'node:fs'

const renderers = ['angular', 'ink', 'react-native', 'react', 'solid', 'svelte', 'vue']
const specific = {
  chat: 'Its suite covers `defineChat`, deterministic answers, the Ask client, the controlled driver, presentation, and the Drizzle Postgres session store.',
  cli: 'Its suite covers `init` and the generated seven-renderer projects.',
  devtools: 'Its suite covers replayable traces and renderer parity.',
  protocol: 'Its suite covers the turn, Ask, backend, decision, parts, and deterministic-answer schemas.',
  server: 'Its suite covers the chat and Ask handlers, decisions, cost, uploads, and known gaps.',
}

for (const id of [...renderers, ...Object.keys(specific)]) {
  const detail = renderers.includes(id)
    ? 'Its suite covers the shell and the shared protocol conformance corpus.'
    : specific[id]
  appendFileSync(
    `docs/for-agents/packages/${id}.md`,
    `\n\n## Tests and fixtures\n\n\`packages/${id}/tests\` holds the package's Vitest suite. ${detail} \`packages/${id}/fixtures\` holds the executable README example that the README-standard gate keeps in sync with the package README.\n`,
  )
}
